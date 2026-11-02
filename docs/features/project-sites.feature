@zone:dashboard @task:055 @wip
Feature: A project's site
  As someone who plans the work
  I want every project to be at one site of its customer
  So that whoever does the work knows where to go, how to get in and who to meet (ADR-0008)

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And "Acme Ltd" has a site "Haifa warehouse"
    And the site "Haifa warehouse" has a contact "Yossi Mizrahi"

  Scenario: A new project is at one of its customer's sites
    When I open "/dashboard/projects/new"
    And I fill in "Project name" with "Panel upgrade"
    And I select "Acme Ltd" from "Customer"
    And I select "Haifa warehouse" from "Site"
    And I press "Create Project"
    Then I see the heading "Panel upgrade"
    And the "Site" section shows "Haifa warehouse"
    And the "Site" section shows "Yossi Mizrahi"
    And I see the "Open in maps" link
    When I follow the "Haifa warehouse" link
    Then I see the heading "Haifa warehouse"

  Scenario: A new project needs a customer and a site
    When I open "/dashboard/projects/new"
    And I fill in "Project name" with "Panel upgrade"
    And I press "Create Project"
    Then I see the error "Choose a customer"
    When I select "Acme Ltd" from "Customer"
    And I press "Create Project"
    Then I see the error "Choose a site"

  Scenario: The site choices follow the customer
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And "Acme Retail" has a site "Dizengoff store"
    And I have a customer "Globex" with status "Active" and tags "b2b"
    And "Globex" has a site "Globex plant"
    When I open "/dashboard/projects/new"
    And I select "Acme Ltd" from "Customer"
    Then the "Site" select offers "Choose a site, Dizengoff store (Acme Retail), Haifa warehouse" with "Choose a site" chosen
    When I select "Acme Ltd › Acme Retail" from "Customer"
    Then the "Site" select offers "Choose a site, Dizengoff store" with "Choose a site" chosen
    When I select "Globex" from "Customer"
    Then the "Site" select offers "Choose a site, Globex plant" with "Choose a site" chosen

  Scenario: A customer without sites says how to add one
    Given I have a customer "Globex" with status "Active" and tags "b2b"
    When I open "/dashboard/projects/new"
    And I select "Globex" from "Customer"
    Then I see the text "Globex has no sites yet."
    And I see the "Add a site" link

  Scenario: Another customer's site is refused
    Given I have a customer "Globex" with status "Active" and tags "b2b"
    And "Globex" has a site "Globex plant"
    When I open "/dashboard/projects/new"
    And I fill in "Project name" with "Panel upgrade"
    And I select "Acme Ltd" from "Customer"
    And I choose the site "Globex plant" in "Site" by editing the page
    And I press "Create Project"
    Then I see the error "Choose a site of this customer"

  Scenario: An older project without a site asks for one
    Given a project "Old wiring" for "Acme Ltd" from before sites were required, with no site
    When I am on the "Old wiring" project page
    Then the "Site" section shows "No site yet."
    When I follow the "Add a site" link
    And I press "Save changes"
    Then I see the error "Choose a site"
    When I select "Haifa warehouse" from "Site"
    And I press "Save changes"
    Then the "Site" section shows "Haifa warehouse"

  Scenario: A copy keeps the site
    Given I have a project named "Panel upgrade" at the site "Haifa warehouse"
    When I open the copy page of the project "Panel upgrade"
    Then "Haifa warehouse" is selected in "Site"
    When I fill in "Project name" with "Panel upgrade, phase 2"
    And I press "Copy project"
    Then the "Site" section shows "Haifa warehouse"

  Scenario: A site in use can't be deleted
    Given I have a project named "Panel upgrade" at the site "Haifa warehouse"
    When I open the "Haifa warehouse" site page
    And I follow the "Delete site" link
    Then I see the text "Projects at this site: Panel upgrade. Move them to another site first."
    And I do not see the "Yes, delete site" button

  Scenario: A sub-company whose sites the parent's projects use can't move
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And "Acme Retail" has a site "Dizengoff store"
    And I have a customer "Globex" with status "Active" and tags "b2b"
    And I have a project named "Store lights" for "Acme Ltd" at the site "Dizengoff store"
    When I open the edit page of the customer "Acme Retail"
    And I select "Globex" from "Part of"
    And I press "Save customer"
    Then I see the error "Projects of Acme Ltd are at its sites: Store lights"
