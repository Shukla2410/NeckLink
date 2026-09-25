const configs = new Map();
export const bhashiniReady = () =>
  Boolean(
    process.env.BHASHINI_USER_ID &&
    process.env.BHASHINI_API_KEY &&
    process.env.BHASHINI_PIPELINE_ID &&
    !process.env.BHASHINI_API_KEY.startsWith("YOUR_"),
  );
export async function languageTask(
  taskType,
  sourceLanguage,
  targetLanguage,
  input,
  audioConfig = {},
) {
  if (!bhashiniReady()) {
    const e = new Error(
      "Bhashini is not configured. Ask your administrator to add the three Bhashini settings.",
    );
    e.status = 503;
    throw e;
  }
  const key = JSON.stringify([taskType, sourceLanguage, targetLanguage]);
  let cached = configs.get(key);
  if (!cached || cached.expires < Date.now()) {
    const configResponse = await fetch(
      "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
      {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": "application/json",
          userID: process.env.BHASHINI_USER_ID,
          ulcaApiKey: process.env.BHASHINI_API_KEY,
        },
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType,
              config: {
                language: {
                  sourceLanguage,
                  ...(targetLanguage ? { targetLanguage } : {}),
                },
              },
            },
          ],
          pipelineRequestConfig: {
            pipelineId: process.env.BHASHINI_PIPELINE_ID,
          },
        }),
      },
    );
    if (!configResponse.ok)
      throw Object.assign(
        new Error(
          "Bhashini configuration failed; check credentials and language support",
        ),
        { status: 502 },
      );
    const config = await configResponse.json();
    const service = config.pipelineResponseConfig?.find(
      (c) => c.taskType === taskType,
    )?.config?.[0];
    const endpoint = config.pipelineInferenceAPIEndPoint;
    if (!service || !endpoint?.callbackUrl || !endpoint?.inferenceApiKey)
      throw Object.assign(
        new Error(
          "This language/task is not available in the configured Bhashini pipeline",
        ),
        { status: 422 },
      );
    const url = new URL(endpoint.callbackUrl);
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname.endsWith(".bhashini.gov.in") ||
        url.hostname.endsWith(".bhashini.co.in")
      )
    )
      throw new Error("Unexpected Bhashini inference endpoint");
    cached = { service, endpoint, expires: Date.now() + 30 * 60000 };
    configs.set(key, cached);
  }
  const { service, endpoint } = cached;
  const response = await fetch(endpoint.callbackUrl, {
    method: "POST",
    signal: AbortSignal.timeout(25000),
    headers: {
      "Content-Type": "application/json",
      [endpoint.inferenceApiKey.name]: endpoint.inferenceApiKey.value,
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType,
          config: {
            ...service,
            language: {
              sourceLanguage,
              ...(targetLanguage ? { targetLanguage } : {}),
            },
            ...(taskType === "tts" ? { gender: "female" } : {}),
            ...audioConfig,
          },
        },
      ],
      inputData: input,
    }),
  });
  if (!response.ok)
    throw Object.assign(
      new Error("Language service is temporarily unavailable"),
      { status: 502 },
    );
  const result = await response.json();
  return result.pipelineResponse?.[0] || result;
}
