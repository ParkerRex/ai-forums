export interface BrowserInfo {
  browser: string;
  version: string;
  os: string;
}

export function getBrowserInfo(): BrowserInfo {
  const userAgent = navigator.userAgent;

  let browser = "Unknown";
  let version = "Unknown";
  let os = "Unknown";

  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    version = match ? match[1] : "Unknown";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    version = match ? match[1] : "Unknown";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
    const match = userAgent.match(/Version\/([0-9.]+)/);
    version = match ? match[1] : "Unknown";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
    const match = userAgent.match(/Edg\/([0-9.]+)/);
    version = match ? match[1] : "Unknown";
  }

  if (userAgent.includes("Windows")) {
    os = "Windows";
    if (userAgent.includes("Windows NT 10.0")) os = "Windows 10/11";
    else if (userAgent.includes("Windows NT 6.3")) os = "Windows 8.1";
    else if (userAgent.includes("Windows NT 6.2")) os = "Windows 8";
    else if (userAgent.includes("Windows NT 6.1")) os = "Windows 7";
  } else if (userAgent.includes("Mac OS X")) {
    os = "macOS";
    const match = userAgent.match(/Mac OS X ([0-9_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, ".");
      os = `macOS ${version}`;
    }
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
    if (userAgent.includes("Ubuntu")) os = "Ubuntu";
    else if (userAgent.includes("Android")) os = "Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
    const match = userAgent.match(/OS ([0-9_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, ".");
      os = `iOS ${version}`;
    }
  }

  return { browser, version, os };
}
