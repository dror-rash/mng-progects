@zone:dashboard
Feature: From a customer to its sites and their projects
  As an admin
  I want to open a customer, then one of its sites (or a sub-company's), then the projects there
  So that I can find any project the way the work is organized: customer, site, project (ADR-0008)

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"

  @task:072
  Scenario: The customers table lists top-level customers with their counts
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And "Acme Ltd" has a site "Head office"
    And "Acme Retail" has a site "Dizengoff store"
    And I have a project named "Store wiring" for "Acme Ltd › Acme Retail" at the site "Dizengoff store"
    And I have a customer "Globex" with status "Lead" and tags "b2b"
    When I open "/dashboard/customers"
    Then the customers listed are "Acme Ltd, Globex"
    And the "Acme Ltd" row shows "1" under "Sub-companies"
    And the "Acme Ltd" row shows "2" under "Sites"
    And the "Acme Ltd" row shows "1" under "Projects"
    And the "Globex" row shows "0" under "Sites"
    And the "Globex" row shows "Lead" under "Status"

  @task:072
  Scenario: From a customer through a sub-company and a site to a project
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And "Acme Ltd" has a site "Head office"
    And "Acme Retail" has a site "Dizengoff store"
    And I have a project named "Store wiring" for "Acme Ltd › Acme Retail" at the site "Dizengoff store"
    When I open "/dashboard/customers"
    And I follow the "Acme Ltd" link
    Then the sites listed are "Head office"
    And the "Sub-companies" section shows "1 site"
    When I follow the "Acme Retail" link in the "Sub-companies" section
    Then I see the heading "Acme Retail"
    And the sites listed are "Dizengoff store"
    When I follow the "Dizengoff store" link in the "Sites" section
    Then I see the heading "Dizengoff store"
    And I see the text "Acme Ltd › Acme Retail"
    And the "Projects" section shows "Store wiring"
    When I follow the "Store wiring" link in the "Projects" section
    Then I see the heading "Store wiring"
    And the "Site" section shows "Dizengoff store"

  @task:072
  Scenario: A site lists its projects, and a new project starts there
    Given "Acme Ltd" has a site "Haifa warehouse"
    When I open the "Haifa warehouse" site page
    Then I see the text "No projects at this site yet."
    When I follow the "New project" link
    Then "Acme Ltd" is selected in "Customer"
    And "Haifa warehouse" is selected in "Site"
    When I fill in "Project name" with "Forklift bay"
    And I press "Create Project"
    Then I see the heading "Forklift bay"
    When I open the "Haifa warehouse" site page
    Then the "Projects" section shows "Forklift bay"

  @task:072
  Scenario: A site the link can't use is ignored
    Given another user has a customer "Secret Corp" with a site "Vault"
    When I open "/dashboard/projects/new?site=not-a-site"
    Then "Choose a customer" is selected in "Customer"
    And "Choose a site" is selected in "Site"
    When I open the new project page for the other user's site
    Then "Choose a customer" is selected in "Customer"
    And "Choose a site" is selected in "Site"
    And the page shows none of "Secret Corp, Vault"
