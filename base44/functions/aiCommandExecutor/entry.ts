import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { org_id, user_id, command, intent } = await req.json();

    if (!org_id || !command) {
      return Response.json({ error: 'org_id and command required' }, { status: 400 });
    }

    console.log(`⚡ Executing command: "${command}"`);

    const startTime = Date.now();
    let result = null;
    let executed = false;
    let commandType = 'ACTION';
    let resultSummary = '';

    const commandLower = command.toLowerCase();

    // Route to appropriate action
    try {
      if (commandLower.includes('generate') && commandLower.includes('brief')) {
        // Generate executive brief
        const briefResult = await base44.asServiceRole.functions.invoke('aiGenerateExecutiveBrief', {
          org_id
        });
        
        result = briefResult.data;
        executed = true;
        resultSummary = `Executive brief generated for week ${result.week_commencing}, distributed to ${result.distributed_to} recipients`;

      } else if (commandLower.includes('recalculate') && commandLower.includes('allocation')) {
        // Recalculate budget allocation
        const allocationResult = await base44.asServiceRole.functions.invoke('marketing.allocateBudget', {
          org_id
        });
        
        result = allocationResult.data;
        executed = true;
        resultSummary = `Budget allocation recalculated, ${result.allocations_generated} recommendations generated`;

      } else if (commandLower.includes('optimise') || commandLower.includes('optimize')) {
        // Run quote optimizer
        const optimizerResult = await base44.asServiceRole.functions.invoke('quoteOptimiser', {
          org_id
        });
        
        result = optimizerResult.data;
        executed = true;
        resultSummary = `Quote optimization complete, ${result.quotes_optimised} quotes analyzed`;

      } else if (commandLower.includes('forecast') || commandLower.includes('revenue')) {
        // Run revenue simulator
        const revenueResult = await base44.asServiceRole.functions.invoke('revenueSimulator', {
          org_id
        });
        
        result = revenueResult.data;
        executed = true;
        resultSummary = `Revenue forecast updated: £${result.projection?.projection_30d?.toLocaleString()} (30d)`;

      } else if (commandLower.includes('snapshot') || commandLower.includes('metrics')) {
        // Run metrics snapshot
        const snapshotResult = await base44.asServiceRole.functions.invoke('snapshotDirectorMetrics', {
          org_id
        });
        
        result = snapshotResult.data;
        executed = true;
        resultSummary = 'Daily metrics snapshot created successfully';

      } else {
        resultSummary = 'Command not recognized. Try: "generate brief", "recalculate allocation", or "optimize quotes"';
      }

    } catch (execError) {
      console.error('Execution error:', execError);
      resultSummary = `Execution failed: ${execError.message}`;
    }

    const executionTime = Date.now() - startTime;

    // Log command
    await base44.asServiceRole.entities.AICommandLog.create({
      org_id,
      user_id,
      command_type: commandType,
      command_text: command,
      payload_json: { intent, result },
      executed,
      result_summary: resultSummary,
      execution_time_ms: executionTime
    });

    console.log(`✅ Command executed in ${executionTime}ms: ${executed ? 'SUCCESS' : 'FAILED'}`);

    return Response.json({
      success: executed,
      message: executed 
        ? `✅ ${resultSummary}`
        : `⚠️ ${resultSummary}`,
      result,
      execution_time_ms: executionTime
    });

  } catch (error) {
    console.error('aiCommandExecutor error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});