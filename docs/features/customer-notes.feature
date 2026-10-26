@zone:dashboard @task:015
Feature: Customer notes
  As a signed-in user
  I want to keep dated notes about a customer
  So that what I learn isn't lost

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And I am on the "Acme Ltd" customer page

  Scenario: Notes are listed newest first with their date
    When I add the note "Kick-off call went well"
    And I add the note "Asked for a quote on phase 2"
    Then the notes are "Asked for a quote on phase 2, Kick-off call went well"
    And each note shows today's date

  Scenario: Delete a note
    Given I add the note "Kick-off call went well"
    When I press "Delete note"
    Then the "Notes" section does not show "Kick-off call went well"

  @task:025
  Scenario: A note shows who wrote it
    When I add the note "Kick-off call went well"
    Then the "Notes" section shows "by Test User"
