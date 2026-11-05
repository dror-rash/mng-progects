@zone:dashboard
Feature: Uploaded reports
  As someone responsible for a project
  I want to upload the project's reports and find them on the project
  So that the finished report stays with the work it describes (ADR-0008)

  Background:
    Given I am signed in with an existing account
    And I have a customer "Acme Ltd" with status "Active" and tags "retail"
    And "Acme Ltd" has a site "Haifa warehouse"
    And I have a project named "Panel upgrade" at the site "Haifa warehouse"

  @task:064
  Scenario: I upload a report and download it from the project
    When I am on the "Panel upgrade" project page
    And I add the file "inspection-report.pdf" with "Upload a report"
    Then the reports listed are "inspection-report.pdf"
    And the "Reports" section shows "Test User"
    And the "Photos and files" section does not show "inspection-report.pdf"
    And the report "inspection-report.pdf" downloads as "inspection-report.pdf"

  @task:064
  Scenario: A report must be a document, up to 50 MB
    When I am on the "Panel upgrade" project page
    And I add the file "walkthrough.mp4" with "Upload a report"
    Then I see the error "Reports must be PDF, Word, Excel, CSV, text or images"
    When I add a 60 MB file "huge-report.pdf" with "Upload a report"
    Then I see the error "Reports can be up to 50 MB"
    And the "Reports" section shows "No reports yet."

  @task:064
  Scenario: I delete my report, and an admin restores it
    When I am on the "Panel upgrade" project page
    And I add the file "inspection-report.pdf" with "Upload a report"
    And I press "Delete inspection-report.pdf"
    Then the "Reports" section shows "No reports yet."
    When I open "/dashboard/deleted"
    Then I see the text "Report"
    When I press "Restore inspection-report.pdf"
    And I am on the "Panel upgrade" project page
    Then the reports listed are "inspection-report.pdf"

  # Roles and isolation: the leak suite's workspace (partner-access.feature, workers.feature).
  @task:064
  Scenario: A crew worker uploads a report; the auditor and the partner see it
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the customer "Acme Ltd" is assigned to "Northwind" and "Globex"
    And "Northwind" has the project "NW Site" for "Acme Ltd" with the task "Copy"
    And the admin uploaded the report "admin-report.pdf" to "NW Site"
    And I am signed in as a worker
    And I am on the crew of "NW Site"
    When I am on the "NW Site" project page
    And I add the file "crew-report.pdf" with "Upload a report"
    Then the reports listed are "crew-report.pdf, admin-report.pdf"
    And I see the "Delete crew-report.pdf" button
    And I do not see the "Delete admin-report.pdf" button
    When the auditor opens the "NW Site" project page
    Then the auditor sees the text "crew-report.pdf"
    And the auditor sees no "Upload a report" button and no "Delete crew-report.pdf" button
    When the "Northwind" user opens the "NW Site" project page
    Then the "Northwind" user sees the text "crew-report.pdf"

  @task:064
  Scenario: Another partner's report stays hidden, its address included
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the customer "Acme Ltd" is assigned to "Northwind" and "Globex"
    And "Northwind" has the project "NW Site" for "Acme Ltd" with the task "Copy"
    And "Globex" has the project "GX App" for "Acme Ltd" with the task "Login"
    And the admin uploaded the report "globex-report.pdf" to "GX App"
    And I am signed in as a user of "Northwind"
    When I open the address of the report "globex-report.pdf"
    Then it is not found, the same as a made-up photo address

  @task:064
  Scenario: A worker doesn't see the report of a project they're not on
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the customer "Acme Ltd" is assigned to "Northwind" and "Globex"
    And "Globex" has the project "GX App" for "Acme Ltd" with the task "Login"
    And the admin uploaded the report "globex-report.pdf" to "GX App"
    And I am signed in as a worker
    When I open the address of the report "globex-report.pdf"
    Then it is not found, the same as a made-up photo address

  @task:064
  Scenario: My report uploads are refused for another partner's project
    Given a workspace with the partners "Northwind" and "Globex", an admin and an auditor
    And the customer "Acme Ltd" is assigned to "Northwind" and "Globex"
    And "Northwind" has the project "NW Site" for "Acme Ltd" with the task "Copy"
    And "Globex" has the project "GX App" for "Acme Ltd" with the task "Login"
    And I am signed in as a user of "Northwind"
    When I start a report upload on "NW Site" with the project id of "GX App"
    Then the upload is refused, the same as with a made-up id
    And the admin sees no reports on "GX App"
