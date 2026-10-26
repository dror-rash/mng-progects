@zone:dashboard @task:025
Feature: Task assignees and My tasks
  As a team member
  I want each task to have one owner and a list of my own tasks
  So that we know who is doing what

  Background:
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"

  Scenario: Assign a task to a teammate
    Given I create an invite link
    And a teammate joins with the invite link
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And I am on the "Write copy" task page
    When I select "Teammate" from "Assignee"
    And I press "Save changes"
    Then I see the text "Assigned to Teammate"
    When I am on the "Website Redesign" project page
    Then the task "Write copy" shows "Teammate"

  Scenario: My tasks lists my open tasks and drops done ones
    Given I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the task "Write copy" is assigned to "Test User"
    When I open "/dashboard/my-tasks"
    Then the "My tasks" section shows "Write copy"
    And the "My tasks" section shows "Website Redesign"
    When I am on the "Website Redesign" project page
    And I move the task "Write copy" to "Done"
    And I open "/dashboard/my-tasks"
    Then the "My tasks" section does not show "Write copy"

  Scenario: Removing a member clears their assignments
    Given I create an invite link
    And a teammate joins with the invite link
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the task "Write copy" is assigned to "Teammate"
    When I open "/dashboard/workspace"
    And I press "Remove Teammate"
    And I am on the "Website Redesign" project page
    And I am on the "Write copy" task page
    Then I see the text "Unassigned"

  Scenario: Someone outside the workspace can't be assigned
    Given I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And I am on the "Write copy" task page
    When I choose someone outside the workspace in "Assignee"
    And I press "Save changes"
    Then I see the error "Choose someone in this workspace"
