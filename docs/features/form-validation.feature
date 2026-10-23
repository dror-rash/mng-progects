@zone:dashboard @task:012
Feature: Form validation
  As a signed-in user
  I want clear messages when I leave a required field blank
  So that I can fix it without losing what I typed

  Background:
    Given I am signed in with an existing account

  Scenario: Blank project name when creating a project
    When I open "/dashboard/projects"
    And I fill in "Project name" with "   "
    And I fill in "Description" with "Keep this text"
    And I press "Create Project"
    Then I see the error "Project name is required"
    And the "Description" field contains "Keep this text"

  Scenario: Blank project name when editing a project
    Given I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    When I follow the "Edit project" link
    And I fill in "Project name" with "   "
    And I press "Save changes"
    Then I see the error "Project name is required"

  Scenario: Blank task title
    Given I have a project named "Website Redesign"
    And I am on the "Website Redesign" project page
    When I fill in "Task title" with "   "
    And I press "Add task"
    Then I see the error "Task title is required"
