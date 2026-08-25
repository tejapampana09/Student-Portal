import axios from "axios";
import * as cheerio from "cheerio";
import { generateCourseraModuleTasks } from "@/server/ai/smartTaskService";

export interface ScrapedCourseraCourse {
  title: string;
  totalModules: number;
  instructor?: string;
  partner?: string;
  description?: string;
  breakdown: Array<{ moduleNum: number; tasks: string[] }>;
}

export async function fetchCourseraCourseByUrl(url: string): Promise<ScrapedCourseraCourse> {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith("http")) {
    cleanUrl = "https://" + cleanUrl;
  }

  let title = "";
  let totalModules = 4;
  let instructor = "";
  let partner = "";
  let description = "";

  try {
    const res = await axios.get(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 6000,
    });

    const $ = cheerio.load(res.data);

    // 1. Course Title
    title = $('meta[property="og:title"]').attr("content") ||
            $('h1').first().text().trim() ||
            $('title').text().replace("| Coursera", "").trim();

    // Clean title suffixes
    title = title.replace(/\| Coursera.*$/i, "").replace(/Coursera/gi, "").trim();

    // 2. Extract modules/weeks from schema or text
    const pageText = $('body').text();
    const weeksMatch = pageText.match(/(\d+)\s*(?:weeks?|modules?)/i);
    if (weeksMatch && weeksMatch[1]) {
      const parsedWeeks = parseInt(weeksMatch[1], 10);
      if (parsedWeeks >= 1 && parsedWeeks <= 20) {
        totalModules = parsedWeeks;
      }
    }

    // Check headings count for modules if any
    const moduleHeadings = $('h3:contains("Week"), h3:contains("Module"), div[data-testid="module-title"]');
    if (moduleHeadings.length > 0) {
      totalModules = moduleHeadings.length;
    }

    // 3. Description & Partner
    description = $('meta[property="og:description"]').attr("content") || "";
  } catch (err: any) {
    console.warn("Coursera HTML scrape fallback for URL:", cleanUrl, err.message);
  }

  // If title was not found from HTML, parse from slug
  if (!title) {
    const slugMatch = cleanUrl.match(/\/(?:learn|specializations|professional-certificates)\/([a-zA-Z0-9_-]+)/);
    if (slugMatch && slugMatch[1]) {
      title = slugMatch[1]
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    } else {
      title = "Coursera Certification Course";
    }
  }

  // Generate actionable module tasks using Gemini AI
  const breakdown = await generateCourseraModuleTasks(title, totalModules);

  return {
    title,
    totalModules,
    instructor,
    partner,
    description,
    breakdown,
  };
}
