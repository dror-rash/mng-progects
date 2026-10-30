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

  @task:027
  Scenario: Removing the last admin shows the error on that row
    Given I create an invite link
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    And the "Remove Teammate" form is changed to remove me
    And I press "Remove Teammate"
    Then the "Teammate" row shows the error "A workspace needs at least one admin"
    And I see the "Remove Teammate" button

  @task:027
  Scenario: Demoting the last admin shows the error on that row
    Given I create an invite link
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    And the "Make admin Teammate" form is changed to make me a member
    And I press "Make admin Teammate"
    Then the "Teammate" row shows the error "A workspace needs at least one admin"
    And I see the "Remove Teammate" button

  @task:027
  Scenario: Removing someone already removed in another tab shows an error
    Given I create an invite link
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    And I remove "Teammate" in another tab
    And I press "Remove Teammate"
    Then the "Teammate" row shows the error "Not a member of this workspace"

  @task:027
  Scenario: Revoking a link already revoked in another tab shows an error
    Given I create an invite link
    When I open "/dashboard/workspace"
    And I revoke the invite link in another tab
    And I press "Revoke invite link"
    Then the invite link row shows the error "This invite link was already revoked"

  @task:027
  Scenario Outline: A member can't use admin actions by changing the form
    Given I create an invite link
    And a teammate joins with the invite link
    And I join the teammate's workspace with an invite link they created
    When the teammate posts "<button>" for my workspace from their own members page
    Then the teammate sees the error "Only admins can manage this workspace"
    And my workspace still has "Teammate" as a member and one open invite link

    Examples:
      | button                 |
      | Make admin Test User   |
      | Remove Test User       |
      | Revoke invite link     |

  @task:027
  Scenario: Removing a member can also revoke the open invite links
    Given I create an invite link
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    And I check "Also revoke open invite links" for "Teammate"
    And I press "Remove Teammate"
    Then I see no open invite links
    And the teammate opening the invite link again sees "This invite link is invalid or has expired"

  @task:027
  Scenario: Removing a member keeps the invite links by default
    Given I create an invite link
    And a teammate joins with the invite link
    When I open "/dashboard/workspace"
    And I press "Remove Teammate"
    Then I see the "Revoke invite link" button

  @task:027
  Scenario: Copying a new invite link
    Given I create an invite link
    When I copy the invite link
    Then I see the "Copied" button
    And the clipboard holds the invite link
