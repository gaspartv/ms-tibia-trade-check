import * as cheerio from "cheerio";
import { env } from "../../config/env.js";
import {
  CoinsHistoryEntry,
  CoinsHistoryResult,
  FlareSolverrCookie,
  FlareSolverrResponse,
} from "./coins-history.types.js";

const TIBIA_COINS_HISTORY_URL =
  "https://www.tibia.com/account/?subtopic=accountmanagement&page=tibiacoinshistory";

async function loginAndGetSession(
  email: string,
  password: string
): Promise<{ sessionId: string; cookies: FlareSolverrCookie[] }> {
  const sessionId = `coins_history_${Date.now()}`;

  console.log("Criando sessão no FlareSolverr...");
  const createSessionResponse = await fetch(env.FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "sessions.create",
      session: sessionId,
    }),
  });

  const createSessionData = (await createSessionResponse.json()) as {
    status: string;
    message: string;
  };
  if (createSessionData.status !== "ok") {
    throw new Error(`Falha ao criar sessão: ${createSessionData.message}`);
  }
  console.log(`Sessão criada: ${sessionId}`);

  console.log("Acessando página de login via FlareSolverr...");
  const getLoginPageResponse = await fetch(env.FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.get",
      url: "https://www.tibia.com/account/?subtopic=accountmanagement",
      session: sessionId,
      maxTimeout: 120000,
    }),
  });

  const loginPageData =
    (await getLoginPageResponse.json()) as FlareSolverrResponse;

  if (loginPageData.status !== "ok" || !loginPageData.solution) {
    throw new Error(
      `Falha ao acessar página de login: ${loginPageData.message}`
    );
  }

  console.log("Enviando credenciais de login...");
  const postData = `loginemail=${encodeURIComponent(
    email
  )}&loginpassword=${encodeURIComponent(password)}&login=Log+In`;

  const loginResponse = await fetch(env.FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.post",
      url: "https://www.tibia.com/account/?subtopic=accountmanagement",
      session: sessionId,
      postData: postData,
      maxTimeout: 60000,
    }),
  });

  const loginData = (await loginResponse.json()) as FlareSolverrResponse;

  if (loginData.status !== "ok" || !loginData.solution) {
    throw new Error(`Falha ao fazer login: ${loginData.message}`);
  }

  const responseHtml = loginData.solution.response;
  const isLogged =
    responseHtml.includes("Account Status") ||
    responseHtml.includes("Account Management") ||
    responseHtml.includes("Logout");

  if (!isLogged) {
    throw new Error("Login falhou. Verifique suas credenciais.");
  }

  console.log("Login realizado com sucesso!");

  return {
    sessionId,
    cookies: loginData.solution.cookies,
  };
}

async function destroySession(sessionId: string): Promise<void> {
  try {
    await fetch(env.FLARESOLVERR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "sessions.destroy",
        session: sessionId,
      }),
    });
    console.log(`Sessão ${sessionId} destruída`);
  } catch (error) {
    console.log("Erro ao destruir sessão:", error);
  }
}

function parseCoinsHistoryTable(html: string): CoinsHistoryEntry[] {
  const $ = cheerio.load(html);
  const entries: CoinsHistoryEntry[] = [];

  $("tr").each((_, row) => {
    const $row = $(row);

    if ($row.hasClass("LabelH")) return;

    const cells = $row.find("td");

    if (cells.length < 5) return;

    const numberCell = $(cells[0]).text().trim();
    const dateCell = $(cells[1]).text().trim();
    const descriptionCell = $(cells[2]).text().trim();
    const characterCell = $(cells[3]).find("a").text().trim();
    const balanceCell = $(cells[4]);

    const entryNumber = parseInt(numberCell, 10);
    if (isNaN(entryNumber)) return;

    const balanceSpan = balanceCell
      .find("span.ColorRed, span.ColorGreen")
      .first();
    let balanceValue = 0;

    if (balanceSpan.length > 0) {
      const balanceText = balanceSpan
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();
      balanceValue = parseInt(balanceText.replace(/[^\d-+]/g, ""), 10) || 0;
    } else {
      const balanceText = balanceCell.text().trim();
      balanceValue = parseInt(balanceText.replace(/[^\d-+]/g, ""), 10) || 0;
    }

    const coinIcon = balanceCell.find("img").attr("src") || "";
    const coinType: "transferable" | "non-transferable" = coinIcon.includes(
      "tibiacointrusted"
    )
      ? "transferable"
      : "non-transferable";

    const normalizedDate = dateCell.replace(/\s+/g, " ").trim();

    entries.push({
      number: entryNumber,
      date: normalizedDate,
      description: descriptionCell,
      character: characterCell,
      balance: balanceValue,
      coinType: coinType,
    });
  });

  entries.sort((a, b) => b.number - a.number);

  return entries;
}

export async function scrapeCoinsHistory(
  email: string,
  password: string
): Promise<CoinsHistoryResult> {
  let sessionId: string | null = null;

  try {
    const session = await loginAndGetSession(email, password);
    sessionId = session.sessionId;

    console.log("Acessando página de Tibia Coins History...");
    const coinsPageResponse = await fetch(env.FLARESOLVERR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url: TIBIA_COINS_HISTORY_URL,
        session: sessionId,
        maxTimeout: 60000,
      }),
    });

    const coinsPageData =
      (await coinsPageResponse.json()) as FlareSolverrResponse;

    if (coinsPageData.status !== "ok" || !coinsPageData.solution) {
      throw new Error(
        `Falha ao acessar página de Coins History: ${coinsPageData.message}`
      );
    }

    const html = coinsPageData.solution.response;
    console.log(
      `Página de Coins History carregada. Status: ${coinsPageData.solution.status}`
    );

    if (
      html.includes("Please log in") ||
      html.includes("loginemail") ||
      !html.includes("Account")
    ) {
      throw new Error("Sessão expirou ou não está autenticado.");
    }

    const entries = parseCoinsHistoryTable(html);

    console.log(`Encontradas ${entries.length} entradas de Coins History`);

    await destroySession(sessionId);

    return {
      success: true,
      entries,
      totalEntries: entries.length,
    };
  } catch (error) {
    if (sessionId) {
      await destroySession(sessionId);
    }

    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";

    return {
      success: false,
      entries: [],
      totalEntries: 0,
      error: errorMessage,
    };
  }
}

export async function scrapeCoinsHistoryWithSession(
  sessionId: string
): Promise<CoinsHistoryResult> {
  try {
    console.log(
      "Acessando página de Tibia Coins History com sessão existente..."
    );
    const coinsPageResponse = await fetch(env.FLARESOLVERR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url: TIBIA_COINS_HISTORY_URL,
        session: sessionId,
        maxTimeout: 60000,
      }),
    });

    const coinsPageData =
      (await coinsPageResponse.json()) as FlareSolverrResponse;

    if (coinsPageData.status !== "ok" || !coinsPageData.solution) {
      throw new Error(
        `Falha ao acessar página de Coins History: ${coinsPageData.message}`
      );
    }

    const html = coinsPageData.solution.response;

    if (html.includes("Please log in") || html.includes("loginemail")) {
      throw new Error("Sessão expirou ou não está autenticado.");
    }

    const entries = parseCoinsHistoryTable(html);

    return {
      success: true,
      entries,
      totalEntries: entries.length,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";

    return {
      success: false,
      entries: [],
      totalEntries: 0,
      error: errorMessage,
    };
  }
}
