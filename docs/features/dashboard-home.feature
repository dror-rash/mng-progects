@zone:dashboard @task:009
Feature: Dashboard home
  As a signed-in user
  I want my home page to show how my projects are doing
  So that I can see progress at a glance and jump into recent work

  Background:
    Given I am signed in with an existing account

  Scenario: Home shows tasks by status
    Given I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the project has a task "Pick fonts"
    And the project has a task "Ship it"
    And I move the task "Pick fonts" to "In progress"
    And I move the task "Ship it" to "Done"
    When I open "/dashboard"
    Then the "Tasks by status" chart shows "To do" as "1"
    And the "Tasks by status" chart shows "In progress" as "1"
    And the "Tasks by status" chart shows "Done" as "1"

  Scenario: Home lists the five most recently started projects
    Given I have projects named "Alpha, Bravo, Charlie, Delta, Echo, Foxtrot"
    When I open "/dashboard"
    Then the recently started projects are "Foxtrot, Echo, Delta, Charlie, Bravo"
    And I see the "View all projects" link

  Scenario: A recent project shows its progress
    Given I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    And the project has a task "Write copy"
    And the project has a task "Ship it"
    And I move the task "Ship it" to "Done"
    When I open "/dashboard"
    Then the "Website Redesign" progress meter is at 50 percent

  Scenario: Home has no create-project form
    When I open "/dashboard"
    Then I do not see the "Create Project" button

  Scenario: All projects page lists every project and creates new ones
    Given I have projects named "Alpha, Bravo, Charlie, Delta, Echo, Foxtrot"
    When I open "/dashboard"
    And I follow the "View all projects" link
    Then I see the heading "All projects"
    And I see the "Alpha" link
    When I fill in "Project name" with "Golf"
    And I press "Create Project"
    Then I see the "Golf" link
