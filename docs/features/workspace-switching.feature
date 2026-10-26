@zone:dashboard @task:024
Feature: Switching workspaces
  As someone in more than one workspace
  I want to switch between them and start new ones
  So that each team's work stays separate

  Background:
    Given I am signed in with an existing account

  Scenario: Create a second workspace and switch between them
    Given I have a project named "Personal plan"
    When I create a workspace named "Acme Team"
    Then I see the text "Acme Team"
    When I open "/dashboard/projects"
    Then I do not see the "Personal plan" link
    When I switch to "Test User's workspace"
    And I open "/dashboard/projects"
    Then I see the "Personal plan" link

  Scenario: A workspace needs a name
    When I open "/dashboard/workspaces"
    And I fill in "Workspace name" with "   "
    And I press "Create workspace"
    Then I see the error "Workspace name is required"

  Scenario: The workspaces page lists mine and marks the current one
    Given I create a workspace named "Acme Team"
    When I open "/dashboard/workspaces"
    Then the "Your workspaces" section shows "Acme Team"
    And the "Your workspaces" section shows "Test User's workspace"
    And the "Your workspaces" section shows "Current"

  Scenario: A teammate who joined can switch back to their own workspace
    Given I create an invite link
    And a teammate joins with the invite link
    When the teammate switches to "Teammate's workspace"
    Then the teammate sees the text "Teammate's workspace"
