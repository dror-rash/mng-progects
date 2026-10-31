@zone:dashboard @task:048
Feature: Partner companies
  As a workspace admin
  I want to set up partner companies, assign them customers and invite their people
  So that partners can work for the customers they serve, and see nothing else (ADR-0006)

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"

  Scenario: An admin creates a partner and assigns customers
    When I open "/dashboard/partners"
    And I follow the "New partner" link
    And I fill in "Name" with "Northwind"
    And I press "Create partner"
    Then I see the heading "Northwind"
    When I select "Acme Ltd" from "Customer"
    And I press "Assign customer"
    Then the "Customers" section shows "Acme Ltd"
    When I open "/dashboard/partners"
    Then the "Northwind" row shows "1 customer"

  Scenario: A blank partner name shows an error
    When I open "/dashboard/partners/new"
    And I fill in "Name" with "   "
    And I press "Create partner"
    Then I see the error "Enter a name"

  Scenario: A partner invite link makes a partner user
    Given I have a partner "Northwind" with the customer "Acme Ltd"
    When I create an invite link for the role "Partner: Northwind"
    And a teammate joins with the invite link
    And I open "/dashboard/workspace"
    Then the "Teammate" row shows the role "Partner: Northwind"
    When I open the "Northwind" partner page
    Then the "Users" section shows "Teammate"

  Scenario: Someone already in the workspace opens a partner link
    Given I have a partner "Northwind" with the customer "Acme Ltd"
    And I create an invite link for the role "Partner: Northwind"
    When I open the invite link
    Then I see the text "You're already a member of this workspace"
    When I open "/dashboard/workspace"
    Then the "Test User" row shows the role "Admin"

  @slow
  Scenario: Changing a user's partner clears assignments they can no longer see
    Given I have a partner "Northwind" with the customer "Acme Ltd"
    And I have a partner "Contoso"
    And I create an invite link for the role "Partner: Northwind"
    And a teammate joins with the invite link
    And "Northwind" has a project "Northwind Site" for the customer "Acme Ltd"
    And I am on the "Northwind Site" project page
    And the project has a task "Write copy"
    And the task "Write copy" is assigned to "Teammate"
    When I change the role of "Teammate" to "Partner: Contoso"
    And I am on the "Northwind Site" project page
    Then the task "Write copy" does not show "Teammate"

  Scenario: Auditors see partners but can't change them
    Given I have a partner "Northwind" with the customer "Acme Ltd"
    And an auditor joins my workspace
    Then the auditor sees no "New partner" link on "/dashboard/partners"
    And the auditor sees the "Northwind" partner with the customer "Acme Ltd" and no "Assign customer" or "Unassign" buttons

  Scenario: Partners pages are not found for partner users
    Given I have a partner "Northwind" with the customer "Acme Ltd"
    And I create an invite link for the role "Partner: Northwind"
    And a teammate joins with the invite link
    Then the teammate sees no "Partners" link in the header
    And the teammate opening "/dashboard/partners" sees "This page could not be found."
    And the teammate opening the "Northwind" partner page sees "This page could not be found."
