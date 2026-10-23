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
