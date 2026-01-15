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
  const proxyConfig = env.PROXY_URL
    ? {
        proxy: {
          url: env.PROXY_URL,
          ...(env.PROXY_USERNAME && { username: env.PROXY_USERNAME }),
          ...(env.PROXY_PASSWORD && { password: env.PROXY_PASSWORD }),
        },
      }
    : {};

  const createSessionResponse = await fetch(env.FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "sessions.create",
      session: sessionId,
      ...proxyConfig,
    }),
  });

  const createSessionData = (await createSessionResponse.json()) as {
    status: string;
    message?: string;
  };
  console.log(
    "CREATE SESSION RESPONSE:",
    JSON.stringify(createSessionData, null, 2)
  );
  if (createSessionData.status !== "ok") {
    throw new Error(
      `Falha ao criar sessão: ${JSON.stringify(createSessionData)}`
    );
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
      // Proxy já configurado na sessão, não passar aqui
    }),
  });

  const loginPageData =
    (await getLoginPageResponse.json()) as FlareSolverrResponse;

  if (loginPageData.status !== "ok" || !loginPageData.solution) {
    throw new Error(
      `Falha ao acessar página de login: ${loginPageData.message}`
    );
  }

  console.log("\n=== LOGIN PAGE DEBUG ===");
  console.log(`Status: ${loginPageData.solution.status}`);
  console.log(`URL: ${loginPageData.solution.url}`);
  console.log(`HTML length: ${loginPageData.solution.response.length}`);
  console.log(
    `Has form: ${loginPageData.solution.response.includes("loginemail")}`
  );
  console.log("========================\n");

  console.log("Enviando credenciais de login...");
  // Incluir a URL de redirecionamento para a página de Coins History após login
  const postData = `loginemail=${encodeURIComponent(
    email
  )}&loginpassword=${encodeURIComponent(password)}&login=Log+In`;

  console.log(`PostData: ${postData}`);

  const loginResponse = await fetch(env.FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.post",
      url: "https://www.tibia.com/account/?subtopic=accountmanagement",
      session: sessionId,
      postData: postData,
      maxTimeout: 60000,
      waitInSeconds: 3, // Aguardar após login
      // Proxy já configurado na sessão, não passar aqui
    }),
  });

  const loginData = (await loginResponse.json()) as FlareSolverrResponse;
  console.log("LOGIN RESPONSE STATUS:", loginData.status);
  console.log("LOGIN RESPONSE MESSAGE:", loginData.message);
  console.log("LOGIN RESPONSE HAS SOLUTION:", !!loginData.solution);

  if (loginData.status !== "ok" || !loginData.solution) {
    throw new Error(`Falha ao fazer login: ${JSON.stringify(loginData)}`);
  }

  console.log("\n=== POST LOGIN RESPONSE ===");
  console.log(`Status: ${loginData.solution.status}`);
  console.log(`URL: ${loginData.solution.url}`);
  console.log(
    `Has loginemail form: ${loginData.solution.response.includes("loginemail")}`
  );
  console.log(
    `Has Please log in: ${loginData.solution.response.includes(
      "Please log in"
    )}`
  );
  console.log(`HTML length: ${loginData.solution.response.length}`);
  console.log("===========================\n");

  const responseHtml = loginData.solution.response;
  const responseUrl = loginData.solution.url;
  const responseStatus = loginData.solution.status;

  // Log detalhado para debug
  console.log("\n=== LOGIN DEBUG ===");
  console.log(`URL após login: ${responseUrl}`);
  console.log(`Status HTTP: ${responseStatus}`);
  console.log(`Tamanho HTML: ${responseHtml.length} bytes`);
  console.log(`Primeiros 500 chars: ${responseHtml.substring(0, 500)}`);
  console.log("===================\n");

  // Verificar se o login foi bem-sucedido
  // Pode verificar por URL, status code ou conteúdo
  const isLogged =
    responseStatus === 200 &&
    (responseUrl.includes("account") || responseUrl.includes("tibia.com")) &&
    (responseHtml.includes("Account Status") ||
      responseHtml.includes("Account Management") ||
      responseHtml.includes("Logout") ||
      responseHtml.includes("loginemail") === false); // Se NOT tem form de login = está logado

  if (!isLogged) {
    console.error("HTML response sample:", responseHtml.substring(0, 1000));
    throw new Error("Login falhou. Verifique suas credenciais.");
  }

  console.log("✅ Login realizado com sucesso!");

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

  // Debug logging
  const rows = $("tr");
  console.log(`\n=== PARSE DEBUG ===`);
  console.log(`Total de linhas <tr>: ${rows.length}`);
  console.log(
    `HTML contains 'Coins History': ${html.includes("Coins History")}`
  );
  console.log(
    `HTML contains 'Account Status': ${html.includes("Account Status")}`
  );
  console.log(`Primeiros 1000 chars: ${html.substring(0, 1000)}`);
  console.log(`==================\n`);

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
    console.log(`URL: ${TIBIA_COINS_HISTORY_URL}`);

    const coinsPageResponse = await fetch(env.FLARESOLVERR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url: TIBIA_COINS_HISTORY_URL,
        session: sessionId,
        maxTimeout: 60000,
        waitInSeconds: 3, // Aguardar a página renderizar completamente
        // IMPORTANTE: Não usar proxy aqui - deixar FlareSolverr gerenciar
        // ...(env.PROXY_URL && { proxy: { url: env.PROXY_URL } }),
      }),
    });

    const coinsPageData =
      (await coinsPageResponse.json()) as FlareSolverrResponse;

    console.log("COINS HISTORY GET RESPONSE:");
    console.log("Status:", coinsPageData.status);
    console.log("Message:", coinsPageData.message);
    console.log("Has solution:", !!coinsPageData.solution);
    if (coinsPageData.solution) {
      console.log("Solution status:", coinsPageData.solution.status);
      console.log("Solution URL:", coinsPageData.solution.url);
      console.log(
        "Solution response length:",
        coinsPageData.solution.response.length
      );
    }

    if (coinsPageData.status !== "ok" || !coinsPageData.solution) {
      throw new Error(
        `Falha ao acessar página de Coins History: ${JSON.stringify(
          coinsPageData
        )}`
      );
    }

    const html = coinsPageData.solution.response;
    console.log(
      `Página de Coins History carregada. Status: ${coinsPageData.solution.status}`
    );

    // Debug: salvar HTML para inspeção
    console.log(`\n=== COINS HISTORY PAGE DEBUG ===`);
    console.log(`HTML length: ${html.length} bytes`);
    console.log(
      `Has Cloudflare check: ${
        html.includes("Cloudflare") ||
        html.includes("challenged") ||
        html.includes("cf_challenge")
      }`
    );
    console.log(`Has Account Status: ${html.includes("Account Status")}`);
    console.log(
      `HTML title tag: ${
        html.match(/<title>(.*?)<\/title>/)?.[1] || "NOT FOUND"
      }`
    );

    // Salvar HTML em arquivo para análise
    const fs = await import("fs");
    const htmlFile = `/tmp/coins_history_${sessionId}.html`;
    fs.writeFileSync(htmlFile, html);
    console.log(`HTML salvo em: ${htmlFile}`);

    console.log(`First 1000 chars:\n${html.substring(0, 1000)}`);
    console.log(`===============================\n`);

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
        // Proxy já configurado na sessão, não passar aqui
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
