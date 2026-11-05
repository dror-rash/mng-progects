@zone:dashboard
Feature: Reading forms
  As an admin
  I want to build the forms technicians fill in on site, and publish them when they are ready
  So that readings are recorded the same way every time, against fields that don't change under them (ADR-0008)

  @task:060
  Scenario: I build and publish a reading form
    Given I am signed in with an existing account
    When I open "/dashboard/workspace/settings"
    And I follow the "Reading forms" link
    And I follow the "New form" link
    And I fill in "Name" with "Panel check"
    And I fill in "Description" with "Monthly check of the main panel"
    And I press "Create form"
    Then I see the heading "Panel check"
    And I see the text "Draft"
    When I fill in "Label" with "Voltage"
    And I select "Number" from "Type"
    And I fill in "Unit" with "V"
    And I check "Required"
    And I press "Add field"
    And I fill in "Label" with "Breaker trips"
    And I select "Yes/no" from "Type"
    And I press "Add field"
    And I fill in "Label" with "Notes"
    And I select "Text" from "Type"
    And I press "Add field"
    And I fill in "Label" with "Cable condition"
    And I select "Choice" from "Type"
    And I fill in "Options" with the lines "Good, Worn, Damaged"
    And I press "Add field"
    And I press "Remove Notes"
    Then the fields listed are "Voltage, Breaker trips, Cable condition"
    And the "Fields" section shows "V"
    And the "Fields" section shows "Good, Worn, Damaged"
    When I press "Publish"
    Then I see the text "Published"
    And I do not see the "Add field" button
    And I do not see the "Remove Voltage" button
    When I open "/dashboard/forms"
    Then the "Panel check" row shows "Published"

  @task:060
  Scenario: A form and its fields are checked
    Given I am signed in with an existing account
    When I open "/dashboard/forms/new"
    And I press "Create form"
    Then I see the error "Form name is required"
    When I fill in "Name" with "Panel check"
    And I press "Create form"
    And I press "Publish"
    Then I see the error "Add a field before publishing"
    When I press "Add field"
    Then I see the error "Field label is required"
    When I fill in "Label" with "Cable condition"
    And I select "Choice" from "Type"
    And I fill in "Options" with the lines "Good"
    And I press "Add field"
    Then I see the error "Add at least two options, one per line"
    And the "Fields" section shows "No fields yet."

  @task:060
  Scenario: A published form can't change
    Given I am signed in with an existing account
    And I have a published reading form "Panel check" with the field "Voltage"
    When I post the add-field form of the form "Panel check" with the label "Extra"
    Then I see the error "A published form can't change"
    When I post the remove form of the field "Voltage" of the form "Panel check"
    Then I see the error "A published form can't change"
    When I open the form "Panel check"
    Then the fields listed are "Voltage"

  @task:060
  Scenario: I archive a published form
    Given I am signed in with an existing account
    And I have a published reading form "Panel check" with the field "Voltage"
    When I open the form "Panel check"
    And I press "Archive"
    Then I see the text "Archived"
    And I do not see the "Archive" button
    When I open "/dashboard/forms"
    Then the "Panel check" row shows "Archived"

  @task:060
  Scenario: Another workspace's form stays hidden
    Given I am signed in with an existing account
    And another user has a reading form "Their checks"
    When I open the address of the form "Their checks"
    Then I see "Form not found", the same as with a made-up id

  # Roles and isolation: the leak suite's workspace (partner-access.feature, workers.feature).
  @task:060
  Scenario: Auditors read forms; workers don't see the pages
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the admin published the reading form "Panel check" with the field "Voltage"
    And I am signed in as a worker
    When the auditor opens "/dashboard/forms"
    Then the auditor sees the text "Panel check"
    And the auditor sees no "New form" link
    When the auditor opens the form "Panel check"
    Then the auditor sees the text "Voltage"
    And the auditor sees no "Archive" button
    When I open "/dashboard/forms"
    Then I see the text "This page could not be found."
    When I open the address of the form "Panel check"
    Then I see "Form not found", the same as with a made-up id

  @task:060
  Scenario: Form changes from someone who isn't an admin are refused
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the admin has a draft reading form "Panel check" with the field "Voltage"
    And I am signed in as a user of "Northwind"
    When I open the address of the form "Panel check"
    Then I see "Form not found", the same as with a made-up id
    When I post the add-field form of the form "Panel check" with the label "Extra"
    Then I see "Something went wrong", the same as with a made-up id
    When I post the publish form of the form "Panel check"
    Then I see "Something went wrong", the same as with a made-up id
    And the admin sees the draft form "Panel check" with the fields "Voltage"

  # From the access audit: the rest of the leak suite (partner users, drafts, auditors posting, other admins).
  @task:060
  Scenario Outline: Reading forms pages are not found for <who>, drafts included
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the admin published the reading form "Panel check" with the field "Voltage"
    And the admin has a draft reading form "Wiring check" with the field "Insulation"
    And I am signed in as <who>
    When I open "/dashboard/forms"
    Then I see the text "This page could not be found."
    When I open "/dashboard/forms/new"
    Then I see the text "This page could not be found."
    When I open the address of the form "Panel check"
    Then I see "Form not found", the same as with a made-up id
    When I open the address of the form "Wiring check"
    Then I see "Form not found", the same as with a made-up id

    Examples:
      | who                   |
      | a worker              |
      | a user of "Northwind" |

  @task:060
  Scenario Outline: Form changes posted by <who> are refused
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the admin has a draft reading form "Panel check" with the field "Voltage"
    And I am signed in as <who>
    When I post the add-field form of the form "Panel check" with the label "Extra"
    Then I see "Something went wrong", the same as with a made-up id
    When I post the remove form of the field "Voltage" of the form "Panel check"
    Then I see "Something went wrong", the same as with a made-up id
    When I post the publish form of the form "Panel check"
    Then I see "Something went wrong", the same as with a made-up id
    And the admin sees the draft form "Panel check" with the fields "Voltage"

    Examples:
      | who        |
      | a worker   |
      | an auditor |

  @task:060
  Scenario: An admin of another workspace can't change a form by posting its id from their own workspace
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the admin has a draft reading form "Panel check" with the field "Voltage"
    And I am signed in with an existing account
    When I post the add-field form of the form "Panel check" from my own workspace with the label "Extra"
    Then I see "Something went wrong", the same as with a made-up id
    When I post the remove form of the field "Voltage" of the form "Panel check" from my own workspace
    Then I see "Something went wrong", the same as with a made-up id
    When I post the publish form of the form "Panel check" from my own workspace
    Then I see "Something went wrong", the same as with a made-up id
    And the admin sees the draft form "Panel check" with the fields "Voltage"
