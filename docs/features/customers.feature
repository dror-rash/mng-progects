@zone:dashboard @task:013
Feature: Customers
  As a signed-in user
  I want a list of my customers with their details
  So that I know who I work for and how to reach them

  Background:
    Given I am signed in with an existing account

  Scenario: Create a customer with its details
    When I open "/dashboard/customers"
    And I follow the "New customer" link
    And I fill in "Name" with "Acme Ltd"
    And I select "Active" from "Status"
    And I fill in "Email" with "hello@acme.example"
    And I fill in "Phone" with "+972 3 555 0100"
    And I fill in "Address" with "1 Harbor St, Tel Aviv"
    And I fill in "Website" with "acme.example"
    And I fill in "Company / tax ID" with "514000000"
    And I fill in "Tags" with "retail, enterprise"
    And I fill in "General information" with "Long-time client, prefers email"
    And I press "Save customer"
    Then I see the heading "Acme Ltd"
    And I see the text "hello@acme.example"
    And I see the "https://acme.example" link
    And I see the text "Long-time client, prefers email"

  Scenario: The list filters customers by status and tag
    Given I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And I have a customer "Globex" with status "Lead" and tags "enterprise"
    When I open "/dashboard/customers"
    And I follow the "Lead" link
    Then I see the "Globex" link
    And I do not see the "Acme Ltd" link
    When I open "/dashboard/customers"
    And I follow the "retail" link
    Then I see the "Acme Ltd" link
    And I do not see the "Globex" link

  Scenario: Edit a customer
    Given I have a customer "Acme Ltd" with status "Lead" and tags "retail"
    And I am on the "Acme Ltd" customer page
    When I follow the "Edit customer" link
    And I select "Active" from "Status"
    And I fill in "Phone" with "+972 3 555 0199"
    And I press "Save customer"
    Then I see the text "Active"
    And I see the text "+972 3 555 0199"

  Scenario: Delete a customer
    Given I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And I am on the "Acme Ltd" customer page
    When I follow the "Delete customer" link
    And I press "Yes, delete customer"
    Then the URL path is "/dashboard/customers"
    And I do not see the "Acme Ltd" link

  Scenario: An invalid email is rejected
    When I open "/dashboard/customers/new"
    And I fill in "Name" with "Acme Ltd"
    And I fill in "Email" with "not-an-email"
    And I press "Save customer"
    Then I see the error "Enter a valid email address"

  Scenario: Another user's customer is not shown
    Given another user has a customer named "Secret Corp"
    When I open the other user's customer page
    Then I see the text "Customer not found"
