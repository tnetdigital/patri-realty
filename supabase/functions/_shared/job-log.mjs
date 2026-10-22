export async function logJobFailure(url, key, job, code) {
  if (!url || !key) return;
  try {
    await fetch(url + "/rest/v1/rpc/registrar_falha_rotina", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_name: job, error_code: code }),
    });
  } catch {
    console.error("JOB_LOG_UNAVAILABLE");
  }
}
