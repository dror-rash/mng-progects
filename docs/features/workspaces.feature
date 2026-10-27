@zone:dashboard @task:022
Feature: Workspaces
  As a signed-in user
  I want my work to live in a workspace
  So that I can later share it with my team

  Scenario: A new account gets a personal workspace
    Given I am signed in with an existing account
    When I open "/dashboard"
    Then I see the text "Test User's workspace"

  Scenario: Projects created in my workspace are listed there
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"
    When I open "/dashboard/projects"
    Then I see the text "Test User's workspace"
    And I see the "Website Redesign" link
