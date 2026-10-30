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

  # Task 028: the token no longer travels in the login URL's `next=`; the visitor still comes back to join.
  @task:028
  Scenario: A signed-out visitor logs in and comes back to the invite
    Given I create an invite link
    When a signed-out teammate opens the invite link
    Then the login page's address doesn't contain the invite token
    When the teammate logs in
    And the teammate presses "Join workspace"
    Then the teammate's workspaces include "Test User's workspace"

  @task:028
  Scenario: A link revoked while its page is open can't be used to join
    Given I create an invite link
    And a teammate opens the invite link
    When I open "/dashboard/workspace"
    And I press "Revoke invite link"
    And the teammate presses "Join workspace"
    Then the teammate sees the error "This invite link is invalid or has expired"
    And the teammate's workspaces don't include "Test User's workspace"

  @task:028
  Scenario: The invite page doesn't send its address to other sites
    Given I create an invite link
    Then opening the invite link answers with the header "Referrer-Policy: no-referrer"

  @task:026
  Scenario: An admin makes a teammate an admin
    Given I create an invite link
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    And I press "Make admin Teammate"
    Then I see the "Make member Teammate" button

  @task:026
  Scenario: Someone removed from their first workspace stays removed
    Given I have a project named "Website Redesign"
    And I create an invite link
    And a teammate joins with the invite link
    And I make the teammate an admin
    When the teammate removes "Test User" from the workspace
    And I open "/dashboard/projects"
    Then I do not see the "Website Redesign" link

  @task:026
  Scenario: Two admins removing each other at once leave one admin
    Given I have a project named "Website Redesign"
    And I create an invite link
    And a teammate joins with the invite link
    And I make the teammate an admin
    When the teammate and I remove each other at the same time
    Then exactly one of us can still open the "Website Redesign" project

  @task:026
  Scenario: A members page left open acts on the workspace it shows
    Given I create an invite link
    And a teammate joins with the invite link
    And I create a workspace named "Acme Team"
    And I create an invite link
    And the teammate joins with the invite link
    And I switch to "Test User's workspace"
    And I open "/dashboard/workspace"
    When I switch to "Acme Team" in another tab
    And I press "Remove Teammate"
    Then the teammate's workspaces don't include "Test User's workspace"
    And the teammate's workspaces include "Acme Team"

  @task:026
  Scenario: A member can't create invite links by changing the form
    Given I create an invite link
    And a teammate joins with the invite link
    When the teammate posts "Create invite link" for my workspace from their own members page
    Then the teammate sees the error "Only admins can manage this workspace"
