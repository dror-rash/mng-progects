@wip @zone:dashboard @task:011
Feature: Task details
  As a signed-in user
  I want a page for each task
  So that I can describe the work and fix its title

  Background:
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"

  Scenario: Open a task from the board
    When I follow the "Write copy" link
    Then I see the heading "Write copy"
    And I see the text "To do"

  Scenario: Edit a task's title and description
    Given I am on the "Write copy" task page
    When I fill in "Title" with "Write homepage copy"
    And I fill in "Description" with "Hero, features, and pricing sections"
    And I press "Save changes"
    Then I see the heading "Write homepage copy"
    And I see the text "Hero, features, and pricing sections"
    When I am on the "Website Redesign" project page
    Then the task "Write homepage copy" is in the "To do" column

  Scenario: Delete a task from its page
    Given I am on the "Write copy" task page
    When I press "Delete task"
    Then I see the heading "Website Redesign"
    And I do not see the task "Write copy"

  Scenario: Another user's task is not shown
    Given another user has a project named "Secret Plans"
    When I open the other user's project "tasks/some-task" page
    Then I see the text "Task not found"
