/**
 * Test the programmatic API
 */
import { quickScan, scanWithFixes, getTools, executeTool } from "./dist/index.js";
import path from "path";

// Use the root project's package.json
const testFile = path.resolve(import.meta.dir, "../../package.json");

async function main() {
    console.log("Testing GitDepSec programmatic API...\n");
    console.log(`Testing with: ${testFile}\n`);

    // Test 1: Quick scan
    console.log("1. Quick Scan:");
    const scanResult = await quickScan(testFile);
    console.log(`   Has vulnerabilities: ${scanResult.hasVulnerabilities}`);
    console.log(`   Risk level: ${scanResult.riskLevel}`);
    console.log(`   Summary: ${scanResult.summary}`);
    console.log();

    // Test 2: Get tools
    console.log("2. Available Tools:");
    const tools = getTools();
    tools.forEach((t) => console.log(`   - ${t.name}: ${t.description.slice(0, 60)}...`));
    console.log();

    // Test 3: Execute tool
    console.log("3. Execute Tool:");
    const toolResult = await executeTool("scan_vulnerabilities", {
        filePath: testFile,
    });
    console.log(`   Result: ${JSON.stringify(toolResult).slice(0, 100)}...`);
    console.log();

    console.log("✅ All tests passed!");
}

main().catch(console.error);
