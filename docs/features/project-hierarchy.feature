@zone:dashboard
Feature: Every project belongs to a customer and one of its sites
  As an admin
  I want the customer, site and project chain to always hold
  So that every project can be found under its customer and site, and nothing is left hanging (ADR-0008)

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And "Acme Ltd" has a site "Haifa warehouse"

  @wip @task:071
  Scenario: A customer with projects can't be deleted
    Given I have a project named "Forklift bay" for "Acme Ltd" at the site "Haifa warehouse"
    And I am on the "Acme Ltd" customer page
    When I follow the "Delete customer" link
    Then I see the text "Projects for this customer or at its sites: Forklift bay. Move or delete them first."
    And I do not see the "Yes, delete customer" button
    When I delete the project "Forklift bay"
    And I delete the customer "Acme Ltd"
    And I open "/dashboard/customers"
    Then I see the text "No customers yet."

  @wip @task:071
  Scenario: A sub-company whose sites have projects can't be deleted
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And "Acme Retail" has a site "Dizengoff store"
    And I have a project named "Store wiring" for "Acme Ltd" at the site "Dizengoff store"
    And I am on the "Acme Retail" customer page
    When I follow the "Delete customer" link
    Then I see the text "Projects for this customer or at its sites: Store wiring. Move or delete them first."
    And I do not see the "Yes, delete customer" button

  @wip @task:071
  Scenario: A deleted project comes back only after its customer
    Given I have a project named "Forklift bay" for "Acme Ltd" at the site "Haifa warehouse"
    And I delete the project "Forklift bay"
    And I delete the customer "Acme Ltd"
    When I restore "Forklift bay" from the Deleted page
    Then I see the error "Restore its customer first"
    When I restore "Acme Ltd" from the Deleted page
    And I restore "Forklift bay" from the Deleted page
    And I am on the "Forklift bay" project page
    Then the "Site" section shows "Haifa warehouse"

  @wip @task:071
  Scenario: A deleted project comes back only after its site
    Given I have a project named "Forklift bay" for "Acme Ltd" at the site "Haifa warehouse"
    And I delete the project "Forklift bay"
    And I delete the site "Haifa warehouse"
    When I restore "Forklift bay" from the Deleted page
    Then I see the error "Restore its site first"
    When I restore "Haifa warehouse" from the Deleted page
    And I restore "Forklift bay" from the Deleted page
    And I am on the "Forklift bay" project page
    Then the "Site" section shows "Haifa warehouse"

  @wip @task:071
  Scenario: The projects filter offers only customers
    Given I have a project named "Forklift bay" for "Acme Ltd" at the site "Haifa warehouse"
    When I open "/dashboard/projects"
    Then the "Customer" select offers "Any customer, Acme Ltd" with "Any customer" chosen
