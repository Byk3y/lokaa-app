#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const COVERAGE_THRESHOLD = process.env.COVERAGE_THRESHOLD || 90;

function parseCoverageReport() {
  try {
    const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    
    const total = coverage.total;
    const lines = total.lines.pct;
    const functions = total.functions.pct;
    const statements = total.statements.pct;
    const branches = total.branches.pct;
    
    const overall = (lines + functions + statements + branches) / 4;
    
    return {
      lines,
      functions,
      statements,
      branches,
      overall: Math.round(overall * 100) / 100
    };
  } catch (error) {
    console.error('Failed to parse coverage report:', error);
    process.exit(1);
  }
}

function checkCoverage() {
  const coverage = parseCoverageReport();
  const results = [];
  
  if (coverage.overall < COVERAGE_THRESHOLD) {
    results.push(`Overall coverage (${coverage.overall}%) is below threshold (${COVERAGE_THRESHOLD}%)`);
  }
  if (coverage.lines < COVERAGE_THRESHOLD) {
    results.push(`Line coverage (${coverage.lines}%) is below threshold`);
  }
  if (coverage.functions < COVERAGE_THRESHOLD) {
    results.push(`Function coverage (${coverage.functions}%) is below threshold`);
  }
  if (coverage.statements < COVERAGE_THRESHOLD) {
    results.push(`Statement coverage (${coverage.statements}%) is below threshold`);
  }
  if (coverage.branches < COVERAGE_THRESHOLD) {
    results.push(`Branch coverage (${coverage.branches}%) is below threshold`);
  }
  
  // Set outputs for GitHub Actions
  console.log(`::set-output name=percentage::${coverage.overall}`);
  console.log(`::set-output name=results::${results.join('\n')}`);
  
  if (results.length > 0) {
    console.error('Coverage check failed:');
    results.forEach(result => console.error(`- ${result}`));
    process.exit(1);
  }
  
  console.log(`✅ All coverage metrics are above ${COVERAGE_THRESHOLD}%`);
  console.log(`Overall: ${coverage.overall}%`);
  console.log(`Lines: ${coverage.lines}%`);
  console.log(`Functions: ${coverage.functions}%`);
  console.log(`Statements: ${coverage.statements}%`);
  console.log(`Branches: ${coverage.branches}%`);
} 