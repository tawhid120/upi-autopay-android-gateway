import { runComprehensiveAudit } from './audit_suite';

async function main() {
  const results = await runComprehensiveAudit();
  console.log('\n====================================================');
  console.log('📊 PAYVERIFY v2 AUTOMATED TEST RESULTS:');
  console.log('====================================================');
  for (const r of results) {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} [Item ${r.item}] ${r.name}: ${r.status}`);
    console.log(`   ➜ ${r.details}`);
    if (r.latencyMs !== undefined) {
      console.log(`   ➜ Measured Latency: ${r.latencyMs}ms`);
    }
    console.log('');
  }
}

main().catch(console.error);
