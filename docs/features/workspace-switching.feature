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
    And "Acme Team" is marked as the current workspace

  Scenario: A teammate who joined can switch back to their own workspace
    Given I create an invite link
    And a teammate joins with the invite link
    When the teammate switches to "Teammate's workspace"
    Then the teammate sees the text "Teammate's workspace"

  @task:026
  Scenario: I can't switch to a workspace I'm not in
    Given another user has a workspace named "Other Team"
    And I create a workspace named "Acme Team"
    When I try to switch to the other user's workspace
    And I open "/dashboard"
    Then I see the text "Acme Team"
    And I do not see the text "Other Team"

  @task:026
  Scenario: A forged workspace cookie shows only my own work
    Given I have a project named "Personal plan"
    And another user has a workspace named "Other Team"
    When my workspace cookie is set to the other user's workspace
    And I open "/dashboard/projects"
    Then I see the "Personal plan" link
    And I do not see the text "Other Team"

  @task:026
  Scenario: A project link works from any of my workspaces
    Given I have a project named "Personal plan"
    And I keep the link to the "Personal plan" project
    And I create a workspace named "Acme Team"
    When I open the kept project link
    Then I see the heading "Personal plan"

  @task:032
  Scenario: Without a saved choice, every load opens my oldest workspace
    Given I create a workspace named "Acme Team"
    And I have no saved workspace
    When I open "/dashboard/workspaces"
    Then "Test User's workspace" is marked as the current workspace
    When I open "/dashboard/workspaces"
    Then "Test User's workspace" is marked as the current workspace
