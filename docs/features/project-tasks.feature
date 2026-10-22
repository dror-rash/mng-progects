@zone:dashboard @task:005
Feature: Project tasks
  As a signed-in user
  I want to open a project and manage its tasks
  So that I can see what is to do, in progress, and done

  Background:
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"

  Scenario: Open a project from the dashboard
    When I open "/dashboard"
    And I follow the "Website Redesign" link
    Then I see the heading "Website Redesign"
    And I see the heading "To do"
    And I see the heading "In progress"
    And I see the heading "Done"

  Scenario: Add a task to a project
    Given I am on the "Website Redesign" project page
    When I fill in "Task title" with "Write homepage copy"
    And I press "Add task"
    Then the task "Write homepage copy" is in the "To do" column

  Scenario: Move a task through the workflow
    Given I am on the "Website Redesign" project page
    And the project has a task "Write homepage copy"
    When I move the task "Write homepage copy" to "In progress"
    Then the task "Write homepage copy" is in the "In progress" column
    When I move the task "Write homepage copy" to "Done"
    Then the task "Write homepage copy" is in the "Done" column

  Scenario: Delete a task
    Given I am on the "Website Redesign" project page
    And the project has a task "Write homepage copy"
    When I delete the task "Write homepage copy"
    Then I do not see the task "Write homepage copy"

  Scenario: Another user's project is not shown
    Given another user has a project named "Secret Plans"
    When I open the other user's project
    Then I see the text "Project not found"
    And I do not see the text "Secret Plans"
