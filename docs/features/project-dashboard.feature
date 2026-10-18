@zone:dashboard @task:003
Feature: Project Management Dashboard
  As an authenticated user
  I want to access my project dashboard and create projects
  So that I can organize and track my team's work

  Scenario: Unauthenticated visitor is redirected to login from dashboard
    When I open "/dashboard"
    Then I am sent to the login page

  Scenario: Authenticated user visits dashboard
    Given I am signed in with an existing account
    When I open "/dashboard"
    Then I see the heading "Project Dashboard"
    And I see the heading "Overview"

  Scenario: Authenticated user creates a new project
    Given I am signed in with an existing account
    When I open "/dashboard"
    And I fill in "Project name" with "Website Redesign"
    And I fill in "Description" with "Revamping our marketing site"
    And I press "Create Project"
    Then I see the text "Website Redesign"
    And I see the text "Revamping our marketing site"
