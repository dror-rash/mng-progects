#!/usr/bin/env node
// What row-level security depends on, pinned (task 068, check-runtime-role.mjs): the views app_user reads, the
// SECURITY DEFINER functions it may run (the access functions the policies call), the SECURITY DEFINER trigger
// functions (triggers fire without EXECUTE), and every policy. Each is a sha256 of its definition as Postgres
// deparses it with search_path pinned (pg-safe.mjs), so every name is schema-qualified. A hash, not "does it
// still call its access function": a redefinition can call it and return every row anyway (`… or true`).
//
// A migration that adds or changes one of these fails the deploy until its hash here is updated on purpose;
// the failure prints the new hash. To print the whole list from a migrated database:
//   DATABASE_URL=… node --experimental-strip-types infra/scripts/rls-pins.mjs --print
// A Postgres version that deparses differently fails safe the same way (CI pins the image, ci.yml).
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { buildPoolConfig, RUNTIME_ROLE } from "../../packages/db/src/pool-config.ts";
import { Client, pinSearchPath, withPinnedSearchPath } from "./pg-safe.mjs";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

export const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

/**
 * The pinnable objects in the database `client` is connected to, with their hashes:
 * views and definer functions app_user can use, definer triggers, and all policies.
 */
export async function readPinnable(client, role = RUNTIME_ROLE) {
  await pinSearchPath(client);
  const views = await client.query(
    `select n.nspname || '.' || c.relname as key,
            coalesce(pg_catalog.array_to_string(c.reloptions, ','), '') as options, pg_catalog.pg_get_viewdef(c.oid) as definition
     from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'v' and n.nspname <> all ($1::text[]) order by 1`,
    [SYSTEM_SCHEMAS],
  );
  const functions = await client.query(
    `select p.oid::pg_catalog.regprocedure::text as key, pg_catalog.pg_get_functiondef(p.oid) as definition
     from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where p.prosecdef and n.nspname <> all ($2::text[])
       and pg_catalog.has_function_privilege($1::text::pg_catalog.name, p.oid, 'EXECUTE')
     order by 1`,
    [role, SYSTEM_SCHEMAS],
  );
  const triggers = await client.query(
    `select n.nspname || '.' || c.relname || ' ' || t.tgname || ' ' || t.tgfoid::pg_catalog.regprocedure::text as key,
            pg_catalog.pg_get_functiondef(t.tgfoid) as definition
     from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace join pg_catalog.pg_proc p on p.oid = t.tgfoid
     where not t.tgisinternal and p.prosecdef and n.nspname <> all ($1::text[]) order by 1`,
    [SYSTEM_SCHEMAS],
  );
  const policies = await client.query(
    `select schemaname || '.' || tablename || '/' || policyname as key, cmd, permissive, roles::text[] as roles, qual, with_check
     from pg_catalog.pg_policies where schemaname <> all ($1::text[]) order by 1`,
    [SYSTEM_SCHEMAS],
  );
  const hashed = (rows, hash) => Object.fromEntries(rows.map((row) => [row.key, hash(row)]));
  return {
    views: hashed(views.rows, (v) => sha256(`${v.options}\n${v.definition}`)),
    functions: hashed(functions.rows, (f) => sha256(f.definition)),
    triggers: hashed(triggers.rows, (t) => sha256(t.definition)),
    policies: hashed(policies.rows, (p) => sha256(JSON.stringify([p.cmd, p.permissive, [...p.roles].sort(), p.qual, p.with_check]))),
  };
}

/** The pins, from the migrations (printed with --print from a database migrated up to 0036). */
export const PINS = {
  views: {
    "public.customer_name": "478a4519a010373bdf60a2d8c9bc542b89d9ebd867609dd5f0f754043874ad2c",
    "public.site_choice": "4c1e7434991881a250ab2b3d2747a1a0eef114004a5c97d87a087693b56c37f0",
  },
  functions: {
    "public.access_role(text,text)": "2d88b8fe768f105e9d6c9b4f2dcc354e3c3d3e1db56952750779aa218c37d62f",
    "public.can_change_attachment(text,text)": "a852629c42a82aa19eefeb60bcf1288f0c890025b4329986a3298392b695b55f",
    "public.can_change_customer(text,text)": "fd75855da2b505b082db308027d21d560f5ddf29ba31c6633485b7c0a48622bc",
    "public.can_change_project(text,text)": "91f8afe6170315ba612bc5720b99a36b9479745994b7b740ba1e2a609cd523c9",
    "public.can_change_site(text,text)": "a7b43babc2e5fb0f4cb3b0c9ed5cd33b09437ea3070bbb575237bbc62fdebb67",
    "public.can_change_visit(text,text)": "c5b4a9cda4b5b2f168d1b87fc665ef211bd8ac6f2146e387258d0378137686f3",
    "public.can_see_customer_name(text,text)": "4bda4229088d270f224d4699f99cb8b40c2447a2e5f0fb9421382886257e2259",
    "public.can_see_customer(text,text)": "dfdaf32fa55610872adc2db92667dac1264042c144875982979c49b382027159",
    "public.can_see_project(text,text)": "935931dd73aae5696b7dd074669ce7ce27dd6b51ca1034d358e0ef9548be3c83",
    "public.can_see_site(text,text)": "5f326beb690ae47111c70ba59da4654dc977833bbbcf9a075027391426c91af5",
    "public.can_work_on_project(text,text)": "63278c8ae33b62923721a1a145e03f6d35ba045fdd9d8f46e4eef90b7d11a59c",
    "public.clear_assignments(text,text)": "616ee508ceb6c591a3a6ca4275b6eb741e6135e2babf7ab30b6b0431fd1aae5b",
    "public.clear_unseen_assignments(text,text)": "13bf81bca18520b58c2951b8d24f15654b8bd507d403d83950f68fcc0ffeee44",
    "public.create_workspace(text,text)": "9bebba1e3b008672301a10de1a0ceda76648dcf31f5e1c1568ef3d9981dcab0b",
    "public.delete_attachment(text)": "66d16d3cf938c5e808db3aa66aa77e1e52f1b22d20a6bb11247410d1681737ac",
    "public.delete_task(text)": "1dc7002d73bd738450cc254d58b59bad4d46a8493c57c48519f0aa92b4584344",
    "public.delete_visit(text)": "c63e0623ec5a66d6016b690a23c5791dc52ed6602154103349960a07eb7c1adc",
    "public.find_invite(text)": "8cc95120e252deb2e324f6ab78f2ae2e8410969d93948b7630f6b85231da4afb",
    "public.has_workspace_role(text,text,text[])": "e3c11a57f3279d62d6303ec8c26d015aed996e6f1b0c4a8d6b4ba5f81eee0c2c",
    "public.is_on_crew(text,text)": "c17b7d884092db2de04ec4f09b3aa47d46efcec13e08327aed3ba67e0514119f",
    "public.is_project_person(text,text)": "08f14e63e59eb94f586214e132aec711d04654dd9192db70f976f2e2bf5779cc",
    "public.join_workspace(text,text)": "f944c96197cbff736989364b432ad470d700c0c151f29a5f02e073a2f96ec4e5",
    "public.partner_serves_customer(text,text)": "24d5bfdd68787287f234e9ad4d06e80759d29fc11926cbae991c4434c205cc98",
    "public.restore_project(text)": "56f0145471d1bc6016aac1782b45f733a9b747ccd76258e1f10993e4ee53f89f",
  },
  triggers: {
    "public.attachment attachment_check public.attachment_check()": "d5e45f97ab1ba1e82a41acf74977efe0b0f67ee907b309e92d6dac31d88d3e59",
    "public.organization organization_parent_check public.organization_parent_check()": "2dca97f90e2daf196824927ce6c6588d9854d8f4a72b8ac5d771aeb9ce2f511e",
    "public.project project_site_check public.project_site_check()": "64e5b97e4e0a5088d2ca160ea31a2d09fa327674f47988ec6613853757288f3d",
    "public.project_worker project_worker_check public.project_worker_check()": "4cd769a66ac17c514f70a4b16a55a1e4c59c04b133bc28a5d8a9f2d92c1fed40",
    "public.project_worker project_worker_clear_assignments public.project_worker_clear_assignments()": "83fe46639747b42d9562ab63600dfe866b188d5093a2e02c7b7a2f2903bcc07f",
    "public.site_visit site_visit_keep_project public.site_visit_keep_project()": "cf62e6ebae6aa3640f6f2b7c9ebb3c5babfed008622b849fb41777c6396a8a25",
    "public.workspace_member workspace_member_leave_crews public.workspace_member_leave_crews()": "88c65c8d34863730a9a7d5d2e119444c16677be8f9aa0f4b4ec9451a2e0d9bb5",
  },
  policies: {
    "public.attachment/attachment_delete": "e29276d3053d78c1b4b1d730e1b0855195a12c94d5419e0e09ec60aab65df10d",
    "public.attachment/attachment_insert": "28427fb17fb36c6c065ce3ebe991add8f6060d8b4dde8e12d417400a99ae6dae",
    "public.attachment/attachment_select": "ac68df6fe4166990f4822b99ef4179f59a8fe8b93fcf624521892b34a1b34a88",
    "public.attachment/attachment_update": "d6eebec4286ad09c7c54176d4963e22e4395a2d6855bc9d9f146218d2168acc9",
    "public.customer_partner/customer_partner_select": "513725896b39e6451e731405f8961c582b62851d64471e9585550f7185797191",
    "public.customer_partner/customer_partner_write": "8b0d06d36e131123dc3db1c9b3636ea0316926de91dd98c8586dd2748c25e649",
    "public.organization/organization_delete": "c4cdabbfaf4d41b3131915fd1e01a239968ae3de86d75296571276d6d8ca3f9f",
    "public.organization/organization_insert": "b834f0490da5b0888b8ca53c3af049b3e8024a406bbd7d7d9a91b36545dfc8c3",
    "public.organization/organization_select": "ef84ef965952ee91dfe8e20d8630450bb42e19beaf5cb336ddff65a73f10e04a",
    "public.organization/organization_update": "ea6cfcece560ec18720165878ea48714e5c32e263bdad7a87b11965f5e982b08",
    "public.organization_contact/organization_contact_select": "ecdb685c731fb473c81c988325fc6cbe4079f760f3679e92ba9a6ac0bf93055a",
    "public.organization_contact/organization_contact_write": "8ddd0c4be5cf8817fa4780d6ede6848ddd53283b53e175ce0659e830be1aff8d",
    "public.organization_note/organization_note_select": "ecdb685c731fb473c81c988325fc6cbe4079f760f3679e92ba9a6ac0bf93055a",
    "public.organization_note/organization_note_write": "8ddd0c4be5cf8817fa4780d6ede6848ddd53283b53e175ce0659e830be1aff8d",
    "public.partner/partner_select": "87b6e8be9381eb867aec56cda1937c4e5059e3b6061501a5132f3dd725b5f819",
    "public.partner/partner_write": "8b0d06d36e131123dc3db1c9b3636ea0316926de91dd98c8586dd2748c25e649",
    "public.project/project_delete": "a5c91745d7b5fb3fb8ebb889565da54784e2e9f179a9ac498036dd3d6166cf56",
    "public.project/project_insert": "712fc3a8cf934f3800630a68b5191a29d0f5aa25d58fc346fefd02df4caa87a5",
    "public.project/project_select": "e3c217a7b51615f902e4f1f930368724c2612ed98994de3cf7a1c62feb9b66c2",
    "public.project/project_update": "bf149e439728ef64e6044d824bb1e968610f2b842c7747225e2a3d872fdba80f",
    "public.project_worker/project_worker_select": "235a12558fb9a74e5aecaeb5ff6e0b61f0523c06e6dc0c797df4ac9e5e95c1c0",
    "public.project_worker/project_worker_write": "8b0d06d36e131123dc3db1c9b3636ea0316926de91dd98c8586dd2748c25e649",
    "public.site/site_delete": "b43cb2b4569eec8a60e60eb03caa87fd98dd045bbaf37d32ad58531264a81bb4",
    "public.site/site_insert": "b834f0490da5b0888b8ca53c3af049b3e8024a406bbd7d7d9a91b36545dfc8c3",
    "public.site/site_select": "d99d8a3c8f86d7a7c467c7634307678e87a9eb1b0cf4fcb5a01a4d990d4266bd",
    "public.site/site_update": "fa26ade3bbc3252355c0f49672dd4e77574bf692d001238582177344dcce7fc7",
    "public.site_contact/site_contact_select": "de71046aa181d4b5f10735dd3ddad703ec17b111900b56129b3c3c98478eb03d",
    "public.site_contact/site_contact_write": "ae2fddc754b083a9584355358d68d68a3ad646d25dbcdff632ad8014aa3b400e",
    "public.site_visit/site_visit_insert": "fe0394234c50d225ad68cea2702095042dee11fb068cd069576e1fb7a4fab73b",
    "public.site_visit/site_visit_select": "433e77b620c4ac14b06fa553d175d622261ef4fd0dcb57b2422a27d540ef1635",
    "public.site_visit/site_visit_update": "baae14a2759094d816234ea7e715cf5567eed1d6fb619a7660341ca073236720",
    "public.site_visit_member/site_visit_member_select": "76c3745084ac93011f5b7359561c7d5d009bc3cf557d3f8600f83603d674da4f",
    "public.site_visit_member/site_visit_member_write": "cc8b05db5ff94b9de0f8e8ad0778e372b845871df55d8936926cfda0dc0f46f1",
    "public.task/task_delete": "7afe731f320b9b7fc8e1ccc86d874ece0ec0233f6ba360cf53aa61aef269d750",
    "public.task/task_insert": "bf062816a93c4ef0664a25eb92332622648e9b7135cdd74484662db3df0dbf6d",
    "public.task/task_select": "e0f45a34451ed680edf80442e0ef5f4b85b2b2ce09d436e3d56e067d1be749fe",
    "public.task/task_update": "6e13706b510e12e19a9ba5da07e645b3656ca656f41bb5bdf194a96b85070742",
    "public.workspace/workspace_delete": "4c7b3cc26a6d225cdc5a465dc2023fcf1c7a2182c2e47b588613f95784f1669e",
    "public.workspace/workspace_insert": "3353d06b148789aae02efb3fd0d438bc6054e2526174142fe7e749971a80a520",
    "public.workspace/workspace_select": "5adc65d2955efc3a6cc4b1a76d52b9524bf237bb2c84764ee30597fd9f50847f",
    "public.workspace/workspace_update": "07e983470dc45ca10e52d789733608216c0cca91b8fdc2f8600163bd022072d8",
    "public.workspace_invite/workspace_invite_admin": "8b0d06d36e131123dc3db1c9b3636ea0316926de91dd98c8586dd2748c25e649",
    "public.workspace_member/workspace_member_leave": "5d55c97d89b974338cc2b7a97c94ad544b3629e4f7e074242a4a797c4e7581f6",
    "public.workspace_member/workspace_member_select": "43549ad0dc92de3e231811a579b0213d8fd5ede9f18165e8a6df757d75c09ab8",
    "public.workspace_member/workspace_member_write": "8b0d06d36e131123dc3db1c9b3636ea0316926de91dd98c8586dd2748c25e649",
  },
};

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes("--print")) {
  const client = new Client(withPinnedSearchPath(buildPoolConfig(process.env, null)));
  await client.connect();
  try {
    console.log(JSON.stringify(await readPinnable(client), null, 2));
  } finally {
    await client.end();
  }
}
