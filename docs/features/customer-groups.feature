@zone:dashboard @task:053
Feature: Customer groups (sub-companies)
  As an admin
  I want a customer to have sub-companies (sub-brands), each with its own details, contacts and notes
  So that I can record large organizations the way they are, and link projects to the right company (ADR-0008)

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"

  Scenario: Add a sub-company from its parent's page
    Given I am on the "Acme Ltd" customer page
    When I follow the "New sub-company" link
    Then "Acme Ltd" is selected in "Part of"
    When I fill in "Name" with "Acme Retail"
    And I fill in "Phone" with "+972 3 555 0111"
    And I press "Save customer"
    Then I see the heading "Acme Retail"
    And I see the "Acme Ltd" link
    And I see the text "+972 3 555 0111"
    When I follow the "Acme Ltd" link
    Then the "Sub-companies" section shows "Acme Retail"

  Scenario: A sub-company has its own contacts and notes
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And I am on the "Acme Retail" customer page
    When I add the contact "Dana Levi" with the role "Store operations"
    And I add the note "Prefers morning visits"
    Then the "Contacts" section shows "Dana Levi"
    And the "Notes" section shows "Prefers morning visits"
    When I am on the "Acme Ltd" customer page
    Then the "Contacts" section does not show "Dana Levi"
    And the "Notes" section does not show "Prefers morning visits"

  Scenario: The customers list shows sub-companies under their parent
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And I have a customer "Globex" with status "Active" and tags "b2b"
    When I open "/dashboard/customers"
    Then the customers listed are "Acme Ltd, Acme Retail (part of Acme Ltd), Globex"

  Scenario: A filtered list says which company a sub-company is part of
    Given "Acme Ltd" has a sub-company "Acme Retail" with status "Lead"
    When I open "/dashboard/customers"
    And I follow the "Lead" link
    Then the customers listed are "Acme Retail (part of Acme Ltd)"

  Scenario: A project for a sub-company shows on both pages and in pickers with its parent
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And "Acme Retail" has a site "Dizengoff store"
    When I open "/dashboard/projects/new"
    And I select "Acme Ltd › Acme Retail" from "Customer"
    And I select "Dizengoff store" from "Site"
    And I fill in "Project name" with "Store wiring"
    And I press "Create Project"
    Then I see the heading "Store wiring"
    And I see the text "Acme Ltd › Acme Retail"
    When I am on the "Acme Retail" customer page
    Then the "Projects" section shows "Store wiring"
    When I am on the "Acme Ltd" customer page
    Then the "Projects" section shows "Store wiring"

  Scenario: A sub-company can't have sub-companies of its own
    Given "Acme Ltd" has a sub-company "Acme Retail"
    When I am on the "Acme Retail" customer page
    Then I do not see the "New sub-company" link
    When I open "/dashboard/customers/new"
    Then the "Part of" select offers "None, Acme Ltd" with "None" chosen

  Scenario: A company with sub-companies can't become part of another
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And I have a customer "Globex" with status "Active" and tags "b2b"
    When I open the edit page of the customer "Acme Ltd"
    Then the "Part of" select offers "None" with "None" chosen
    And I see the text "Acme Ltd has sub-companies, so it can't be part of another company."

  Scenario: Move a sub-company to another parent or make it independent
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And I have a customer "Globex" with status "Active" and tags "b2b"
    When I open the edit page of the customer "Acme Retail"
    And I select "Globex" from "Part of"
    And I press "Save customer"
    Then I see the "Globex" link
    When I open the edit page of the customer "Acme Retail"
    And I select "None" from "Part of"
    And I press "Save customer"
    Then I do not see the "Globex" link

  Scenario: A company with sub-companies can't be deleted before them
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And I am on the "Acme Ltd" customer page
    When I follow the "Delete customer" link
    Then I see the text "Delete its sub-companies first: Acme Retail"
    And I do not see the "Yes, delete customer" button
    When I delete the customer "Acme Retail"
    And I delete the customer "Acme Ltd"
    And I open "/dashboard/customers"
    Then I see the text "No customers yet."

  Scenario: A sub-company can't be restored before its parent
    Given "Acme Ltd" has a sub-company "Acme Retail"
    And I delete the customer "Acme Retail"
    And I delete the customer "Acme Ltd"
    When I restore "Acme Retail" from the Deleted page
    Then I see the error "Restore its parent first"
    When I restore "Acme Ltd" from the Deleted page
    And I restore "Acme Retail" from the Deleted page
    And I open "/dashboard/customers"
    Then the customers listed are "Acme Ltd, Acme Retail (part of Acme Ltd)"

  Scenario: A tampered parent is refused
    Given "Acme Ltd" has a sub-company "Acme Retail"
    When I open "/dashboard/customers/new"
    And I fill in "Name" with "Acme Online"
    And I choose "Acme Retail" in "Part of" by editing the page
    And I press "Save customer"
    Then I see the error "Choose a company from the list"

  Scenario: Another workspace's customer can't be the parent
    Given I have a customer "Other Co" in a new workspace named "Side"
    And I switch to "Test User's workspace"
    When I open "/dashboard/customers/new"
    And I fill in "Name" with "Acme Online"
    And I choose the customer from my other workspace in "Part of"
    And I press "Save customer"
    Then I see the error "Choose a company from the list"
