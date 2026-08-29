const STANDARD_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const main: Record<string, string> = {
  "User-Agent": STANDARD_UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

export function captcha(jsessionId: string): Record<string, string> {
  return {
    "User-Agent": STANDARD_UA,
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Cookie": `JSESSIONID=${jsessionId}`,
    "Referer": "https://student.srmap.edu.in/srmapstudentcorner/StudentLoginPage",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "same-origin",
  };
}

export function authenticate(jsessionId: string): Record<string, string> {
  return {
    "User-Agent": STANDARD_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://student.srmap.edu.in",
    "Referer": "https://student.srmap.edu.in/srmapstudentcorner/StudentLoginPage",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    "Cookie": `JSESSIONID=${jsessionId}`,
  };
}

export function basic(jsessionId: string): Record<string, string> {
  return {
    "User-Agent": STANDARD_UA,
    "Accept": "text/html, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://student.srmap.edu.in",
    "Referer": "https://student.srmap.edu.in/srmapstudentcorner/HRDSystem",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Cookie": `JSESSIONID=${jsessionId}`,
  };
}
