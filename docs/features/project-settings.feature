@zone:dashboard @task:007
Feature: Project settings
  As a signed-in user
  I want to rename and delete my projects
  So that my project list stays accurate

  Background:
    Given I am signed in with an existing account
    And I have a project named "Website Redesign"

  Scenario: Rename a project
    Given I am on the "Website Redesign" project page
    When I follow the "Edit project" link
    And I fill in "Project name" with "Marketing Site"
    And I fill in "Description" with "Relaunch of the marketing site"
    And I press "Save changes"
    Then I see the heading "Marketing Site"
    And I see the text "Relaunch of the marketing site"
    When I open "/dashboard"
    Then I see the "Marketing Site" link
    And I do not see the "Website Redesign" link

  Scenario: Delete a project
    Given I am on the "Website Redesign" project page
    When I follow the "Delete project" link
    And I press "Yes, delete project"
    Then the URL path is "/dashboard"
    And I do not see the "Website Redesign" link

  Scenario: Cancel deleting a project
    Given I am on the "Website Redesign" project page
    When I follow the "Delete project" link
    And I follow the "Cancel" link
    Then I see the heading "Website Redesign"

  Scenario: Another user's project cannot be edited
    Given another user has a project named "Secret Plans"
    When I open the other user's project "edit" page
    Then I see the text "Project not found"

  Scenario: Another user's project cannot be deleted
    Given another user has a project named "Secret Plans"
    When I open the other user's project "delete" page
    Then I see the text "Project not found"
