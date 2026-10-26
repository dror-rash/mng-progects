@zone:dashboard @task:023
Feature: Workspace members and invite links
  As a workspace admin
  I want to invite teammates and manage who is in my workspace
  So that we can work on the same projects and customers

  Background:
    Given I am signed in with an existing account

  Scenario: A teammate joins with an invite link and sees our projects
    Given I have a project named "Website Redesign"
    When I create an invite link
    And a teammate joins with the invite link
    Then the teammate sees the "Website Redesign" project
    When I open "/dashboard/workspace"
    Then the "Members" section shows "Teammate"

  Scenario: A removed member loses access
    Given I have a project named "Website Redesign"
    And I create an invite link
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    And I press "Remove Teammate"
    Then the teammate can no longer open the "Website Redesign" project

  Scenario: A member doesn't get admin controls
    Given I create an invite link
    And a teammate joins with the invite link
    Then the teammate doesn't see the "Create invite link" button on the members page

  Scenario: A revoked invite link can't be used
    Given I create an invite link
    When I open "/dashboard/workspace"
    And I press "Revoke invite link"
    Then a teammate opening the invite link sees "This invite link is invalid or has expired"

  Scenario: The last admin can't leave
    When I open "/dashboard/workspace"
    And I press "Leave workspace"
    Then I see the error "A workspace needs at least one admin"

  Scenario: A signed-out visitor opening an invite link is sent to log in
    Given I create an invite link
    Then a signed-out visitor opening the invite link is sent to the login page
