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
    Then the task "Write copy" does not show "Teammate"

  Scenario: Someone outside the workspace can't be assigned
    Given I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And I am on the "Write copy" task page
    When I choose someone outside the workspace in "Assignee"
    And I press "Save changes"
    Then I see the error "Choose someone in this workspace"

  @task:031
  Scenario: A former member shows as unassigned even if an assignment survives
    Given I create an invite link
    And a teammate joins with the invite link
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the task "Write copy" is assigned to "Teammate"
    When the teammate's membership is removed directly, keeping the assignment
    And I am on the "Website Redesign" project page
    Then the task "Write copy" does not show "Teammate"
    When I am on the "Write copy" task page
    Then I see the text "Unassigned"
    And I do not see the text "Assigned to Teammate"

  @task:031
  Scenario: My tasks lists tasks from every workspace I'm in, with each workspace's name
    Given I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the task "Write copy" is assigned to "Test User"
    And I create a workspace named "Side Gig"
    And I have a project named "Garden"
    And I am on the "Garden" project page
    And the project has a task "Plant tulips"
    And the task "Plant tulips" is assigned to "Test User"
    When I open "/dashboard/my-tasks"
    Then my task "Plant tulips" shows "Garden · Side Gig"
    And my task "Write copy" shows "Website Redesign · Test User's workspace"

  @task:031
  Scenario: My tasks with the same due date and priority keep their order
    Given I am on the "Website Redesign" project page
    And the project has a task "Alpha"
    And the project has a task "Bravo"
    And the task "Bravo" is assigned to "Test User"
    And the task "Alpha" is assigned to "Test User"
    When I open "/dashboard/my-tasks"
    Then my tasks are "Alpha, Bravo"
    When I reload the page
    Then my tasks are "Alpha, Bravo"

  @task:031
  Scenario: A task I just assigned to myself shows in My tasks without a refresh
    Given I open "/dashboard/my-tasks"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And I am on the "Write copy" task page
    When I select "Test User" from "Assignee"
    And I press "Save changes"
    And I follow the "My tasks" link
    Then the "My tasks" section shows "Write copy"
