@zone:shell @task:002
Feature: Shell Landing and Login Experience
  As a visitor or user
  I want a login page, and the dashboard as home
  So that I understand the project management product and can sign in effortlessly

  @task:036
  Scenario: Choosing dark mode carries across zones and reloads
    Given I am signed in with an existing account
    When I open "/dashboard"
    And I choose the "Dark" theme
    Then the page is dark
    When I log out
    Then I am sent to the login page
    And the page is dark
    When I reload the page
    Then the page is dark

  @task:036
  Scenario: The dashboard header has the theme toggle
    Given I am signed in with an existing account
    When I open "/dashboard"
    And I choose the "Dark" theme
    Then the page is dark
    When I reload the page
    Then the page is dark

  @task:036
  Scenario: The system theme follows the OS setting
    Given my system prefers a dark color scheme
    And I am signed in with an existing account
    When I open "/dashboard"
    And I choose the "System" theme
    Then the page is dark
    When I reload the page
    Then the page is dark

  @task:036
  Scenario: Choosing light mode overrides a dark OS setting
    Given my system prefers a dark color scheme
    And I am signed in with an existing account
    When I open "/dashboard"
    And I choose the "Light" theme
    Then the page is light
    When I reload the page
    Then the page is light
