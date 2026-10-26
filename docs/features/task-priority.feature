@wip @zone:dashboard @task:018
Feature: Task priority
  As a signed-in user
  I want to mark how urgent each task is
  So that the most important work is at the top of the board

  Background:
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the project has a task "Fix checkout bug"

  Scenario: Change a task's priority
    Given I am on the "Fix checkout bug" task page
    When I select "High" from "Priority"
    And I press "Save changes"
    Then I see the text "High priority"
    When I am on the "Website Redesign" project page
    Then the task "Fix checkout bug" shows "High priority"

  Scenario: High-priority tasks are listed first
    Given the task "Fix checkout bug" has priority "High"
    When I am on the "Website Redesign" project page
    Then the "To do" column lists "Fix checkout bug, Write copy"
