@zone:dashboard @task:014
Feature: Customer contacts
  As a signed-in user
  I want to keep the people I work with at each customer
  So that I know who to call about what

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And I am on the "Acme Ltd" customer page

  Scenario: Add a contact person
    When I fill in "Contact name" with "Dana Levi"
    And I fill in "Role" with "Head of Marketing"
    And I fill in "Contact email" with "dana@acme.example"
    And I press "Add contact"
    Then the "Contacts" section shows "Dana Levi"
    And the "Contacts" section shows "Head of Marketing"

  Scenario: Edit and remove a contact person
    Given the customer has a contact "Dana Levi"
    When I follow the "Edit Dana Levi" link
    And I fill in "Role" with "CMO"
    And I press "Save contact"
    Then the "Contacts" section shows "CMO"
    When I press "Remove Dana Levi"
    Then the "Contacts" section does not show "Dana Levi"

  @task:020
  Scenario: Saving a contact that was removed elsewhere says so
    Given the customer has a contact "Dana Levi"
    When I follow the "Edit Dana Levi" link
    And the contact "Dana Levi" is removed in another tab
    And I fill in "Role" with "CMO"
    And I press "Save contact"
    Then I see the error "This contact no longer exists"

  @task:038
  Scenario: Mark a contact as primary
    Given the customer has a contact "Dana Levi"
    And the customer has a contact "Avi Cohen"
    When I press "Make Dana Levi primary"
    Then "Dana Levi" is the only primary contact
    And the contacts are listed as "Dana Levi, Avi Cohen"

  @task:038
  Scenario: Marking another contact moves the primary mark
    Given the customer has a contact "Dana Levi"
    And the customer has a contact "Avi Cohen"
    And "Dana Levi" is the customer's primary contact
    When I press "Make Avi Cohen primary"
    Then "Avi Cohen" is the only primary contact
    And the contacts are listed as "Avi Cohen, Dana Levi"

  @task:038
  Scenario: Removing the primary contact leaves the customer without one
    Given the customer has a contact "Dana Levi"
    And the customer has a contact "Avi Cohen"
    And "Dana Levi" is the customer's primary contact
    When I press "Remove Dana Levi"
    Then the customer has no primary contact
    And the "Contacts" section shows "Avi Cohen"

  @task:038
  Scenario: The customers list shows each customer's primary contact
    Given the customer has a contact "Dana Levi"
    And the customer has a contact "Avi Cohen"
    And "Avi Cohen" is the customer's primary contact
    When I open "/dashboard/customers"
    Then the customer "Acme Ltd" is listed with the contact "Avi Cohen"
    And the customer "Acme Ltd" is not listed with the contact "Dana Levi"

  @task:038
  Scenario: A contact from another customer can't be made primary
    Given I have a customer "Globex" with status "Active" and tags ""
    And the customer has a contact "Sam Cole"
    And I am on the "Acme Ltd" customer page
    And the customer has a contact "Dana Levi"
    When the "Make Dana Levi primary" button is changed to point at "Sam Cole" of "Globex"
    And I press "Make Dana Levi primary"
    Then I see the error "This contact no longer exists"
    And the customer has no primary contact
