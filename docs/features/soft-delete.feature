@zone:dashboard @task:051
Feature: Soft delete, the Deleted page and restore
  As an admin
  I want deleted things to disappear for everyone but stay restorable
  So that a delete is never final, and nobody sees what was deleted (ADR-0006, design rules 8–8c)

  # The leak suite's two-partner workspace (partner-access.feature), written straight to the database;
  # every check goes through the app. "I" am a user of Northwind. Admins restore on the Deleted page,
  # which lists the newest deletion first.
  Background:
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the customer "Acme Ltd" is assigned to "Northwind" and "Globex"
    And "Northwind" has the project "NW Site" for "Acme Ltd" with the task "Homepage"
    And I am signed in as a user of "Northwind"

  Scenario: A deleted project disappears and can be restored with its tasks
    Given "NW Site" also has the task "Footer"
    And the task "Footer" was deleted on its own
    When I am on the "NW Site" project page
    And I follow the "Delete project" link
    And I press "Yes, delete project"
    And I open "/dashboard/projects"
    Then I see the text "No projects yet."
    When I open the address of the "NW Site" project
    Then I see "Project not found", the same as for a made-up project address
    When I open the address of the "Homepage" task
    Then I see "Task not found", the same as for a made-up task address
    And the admin sees no project "NW Site"
    And the admin's deleted items are "NW Site (Project), Footer (Task)"
    When the admin restores "Footer"
    Then the admin sees the error "Restore its project first"
    When the admin restores "NW Site"
    Then the admin's deleted items are "Footer (Task)"
    And the admin sees the tasks of "NW Site" are "Homepage"
    When I open "/dashboard/projects"
    Then the projects shown are "NW Site"

  Scenario: A deleted task can be restored
    When I am on the "NW Site" project page
    And I am on the "Homepage" task page
    And I press "Delete task"
    Then I do not see the task "Homepage"
    When I open the address of the "Homepage" task
    Then I see "Task not found", the same as for a made-up task address
    And the admin's deleted items are "Homepage (Task)"
    When the admin restores "Homepage"
    Then the admin's Deleted page is empty
    When I am on the "NW Site" project page
    And I am on the "Homepage" task page
    Then I see the "Delete task" button

  Scenario: Deleting a customer hides its partner projects from the partner
    When the admin deletes the customer "Acme Ltd"
    And I open "/dashboard/projects"
    Then I see the text "No projects yet."
    When I open the address of the "NW Site" project
    Then I see "Project not found", the same as for a made-up project address
    And the admin sees the "NW Site" project
    And the admin's deleted items are "Acme Ltd (Customer)"
    When the admin restores "Acme Ltd"
    And I open "/dashboard/projects"
    Then the projects shown are "NW Site"

  Scenario: A contact or note comes back only after its customer
    Given the customer "Acme Ltd" has the contact "Jane Roe" and the note "Call on Monday"
    When the admin removes the contact "Jane Roe" and deletes the note "Call on Monday"
    And the admin deletes the customer "Acme Ltd"
    Then the admin's deleted items are "Acme Ltd (Customer), Call on Monday (Note), Jane Roe (Contact)"
    When the admin restores "Jane Roe"
    Then the admin sees the error "Restore its customer first"
    When the admin restores "Acme Ltd"
    And the admin restores "Jane Roe"
    And the admin restores "Call on Monday"
    Then the admin's Deleted page is empty
    And the admin sees the customer "Acme Ltd" with the contact "Jane Roe" and the note "Call on Monday"

  Scenario: Deleting a partner removes its users' access
    Given "Northwind" has an open invite link
    When the admin deletes the partner "Northwind"
    And I open "/dashboard"
    Then the header shows the workspace "Northwind User's workspace"
    When I open the address of the "NW Site" project
    Then I see "Project not found", the same as for a made-up project address
    And someone opening the invite link of "Northwind" sees "This invite link is no longer valid"
    And the admin sees the "NW Site" project
    And the admin's deleted items are "Northwind (Partner)"
    When the admin restores "Northwind"
    And I open "/dashboard/projects"
    Then the projects shown are "NW Site"
    And someone opening the invite link of "Northwind" sees "Join Partner Hub"

  Scenario: Auditors see the Deleted page without Restore
    Given the project "NW Site" was deleted by the admin
    When the auditor opens the Deleted page from the header
    Then the auditor's deleted items are "NW Site (Project)"
    And the auditor sees no "Restore" button

  Scenario: Partners never see deleted items or the Deleted page
    Given "NW Site" also has the task "Footer"
    And the tasks "Homepage, Footer" are assigned to me directly
    And the task "Footer" was deleted on its own
    When I am on the "NW Site" project page
    Then I do not see the task "Footer"
    And the header has no "Deleted" link
    When I open the address of the "Footer" task
    Then I see "Task not found", the same as for a made-up task address
    When I open "/dashboard/my-tasks"
    Then my tasks are "Homepage"
    When I open "/dashboard/deleted"
    Then I see the text "This page could not be found."
