const metrics={requests:0,errors:0,authenticationFailures:0}; export const incrementMetric=(key)=>{if(key in metrics)metrics[key]+=1;}; export const getMetrics=()=>({...metrics});
