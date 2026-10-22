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

  @task:006
  Scenario: Overview shows real task numbers
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the project has a task "Pick fonts"
    And the project has a task "Ship it"
    And I move the task "Ship it" to "Done"
    When I open "/dashboard"
    Then the "Total Projects" stat shows "1"
    And the "Open Tasks" stat shows "2"
    And the "Completion Rate" stat shows "33%"

  @task:006
  Scenario: Overview with no tasks yet
    Given I am signed in with an existing account
    When I open "/dashboard"
    Then the "Open Tasks" stat shows "0"
    And the "Completion Rate" stat shows "0%"

  @task:006
  Scenario: Project card shows task progress
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the project has a task "Ship it"
    And I move the task "Ship it" to "Done"
    When I open "/dashboard"
    Then the "Website Redesign" project card shows "1 of 2 tasks done"

  @task:008
  Scenario: Visitor with an expired session is sent to login from the dashboard
    Given I have an expired session
    When I open "/dashboard"
    Then I am sent to the login page to return to "/dashboard"

  @task:008
  Scenario: Visitor with an expired session is sent to login from a project page
    Given I have an expired session
    When I open "/dashboard/projects/some-project"
    Then I am sent to the login page to return to "/dashboard/projects/some-project"
