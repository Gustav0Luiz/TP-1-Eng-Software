# Cypress Testing Setup

This document explains how to set up and run the Cypress end-to-end tests for this project.

## Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm) must be installed on your system.

## Setup

1.  **Navigate to the frontend directory:**
    Open your terminal and change to the `frontend` directory.
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    Run the following command to install all the necessary packages, including Cypress.
    ```bash
    npm install
    ```

## Running Tests

Once the installation is complete, you can run the tests using the following scripts from the `frontend` directory.

### Interactive Mode

To open the Cypress Test Runner and run tests interactively, use:
```bash
npm run cy:open
```
This is the recommended way to run tests while developing, as it provides a visual interface to see your application and the test execution side-by-side.

### Headless Mode

To run all tests in the terminal without a graphical interface, use:
```bash
npm run cy:run
```
This mode is ideal for running the full test suite, for example, in a CI/CD pipeline. The results will be displayed directly in your terminal.
