// Math for AI: the AI menu opens the Tensors tool, an example and a typed list draw, a list that is not a full box
// says why, and the picture goes on the board and opens again for editing. Tensor operations open on their own tab,
// shapes that do not broadcast say why, and a matrix product goes on the board. Gradient descent opens on three
// learning rates, refuses a rate that is not positive, and draws a path in two variables onto the board.
// Backprop opens on a neuron's squared error, says which input has no value, and draws a step of gradient descent.
// Softmax opens on cat, dog and bird with cat as the target, refuses a target that is not a class, and draws three
// temperatures onto the board. Embeddings open on three words with a query, say which name is unknown, and draw
// king − man + woman onto the board. SVD & PCA opens on a best rank-1 approximation, refuses a rank too large, and
// draws PCA of points onto the board. The gradient descent lab goes on the board from the AI menu: a rate too small
// runs out of steps and says so, the slider sets a better one, and the ball rolls to the bottom for two stars. The PCA
// lab goes on the board too: a line across the cloud is not the best, and turned along it, it is PC1, for two stars.
// The overfitting lab: degree 1 is far from every training point, and degree 9 goes through all ten, for two stars.
// The batch training lab: η = 0.05 is too slow over 20 full-batch epochs, and 0.2 settles at the best line, for two stars.
// The threshold lab: at t = 0.8 recall is too low, and the slider down to 0.3 catches 90 % of the positives, for two stars.
// The k-NN lab: the new point among the blue ones is called blue, and dragged into the orange blob it is orange, for two stars.
// The decision-tree lab: a Check before any split says so, and a cut at x < 0.6 makes both sides pure, for two stars.
// So does the softmax lab: cat's probability is short, and its bar dragged up to 4 gets it over 0.8, for two stars.
// The embeddings lab: dog at right angles to cat is not alike, and its tip dragged beside cat's is, for two stars.
// And the backprop lab: a Check with the boxes empty says which one, and q's box tapped and both boxes filled in are
// right, for two stars. The tensors lab: a Check with nothing tapped says so, T[2, 1] for T[1, 2] has the indices the
// wrong way round, and T[1, 2] is right after those two tries for one star; then T[2, 1]'s place in memory at the first try, linked to it.
import { expect, test } from "@playwright/test";
import { BP_PLOT, bpGraph, bpPos } from "../src/math/backpropLab.ts";
import { ETAS } from "../src/math/batchLab.ts";
import { etaIndex } from "../src/math/descentLab.ts";
import { KNN_PLOT, toPx as knnPx } from "../src/math/knnLab.ts";
import { EMBED_PLOT, toPage as embedPage } from "../src/math/embedLab.ts";
import { moments, PCA_LADDER, principal } from "../src/math/pcaLab.ts";
import { SM_PLOT, zToY } from "../src/math/softmaxLab.ts";
import { TN_PLOT, tnLayout, tnSetup, viewOf } from "../src/math/tensorLab.ts";

test("the tensor tool draws, explains a ragged list and inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Tensors" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Tensors(?! lab)/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Math for AI" })).toBeVisible();
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("[[1, 2], [3]]");
  await expect(dialog.locator(".preview .error")).toHaveText(/Lists of different lengths \(2 and 1\)/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "pick T[1, 2, 3]" }).click();
  await expect(dialog.getByRole("textbox")).toHaveValue("2x3x4; T[1, 2, 3]");
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("tensor.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("2x3x4; T[1, 2, 3]");
});

test("tensor operations: a mismatch says why, and a matrix product inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Tensor operations" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Tensor operations/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Operations" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("textbox")).toHaveValue("2x3x4; reshape 4x6");
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("2x3 + [1, 2]");
  await expect(dialog.locator(".preview .error")).toHaveText(/Shapes \(2, 3\) and \(2\) do not broadcast/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "matrix product" }).click();
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("tensor-ops.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("[[1, 2, 3], [4, 5, 6]] @ [[7, 8], [9, 10], [11, 12]]; [1, 0]");
});

test("gradient descent: three rates, a wrong rate refused, a valley inserted", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Gradient descent" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Gradient descent$/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Gradient descent" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("textbox")).toHaveValue("(x - 3)^2; start 0; rate 0.02, 0.4, 1.05; steps 12");
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("x^2; rate 0");
  await expect(dialog.locator(".preview .error")).toHaveText(/A learning rate is a positive number/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "a long valley zigzags" }).click();
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("descent.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("x^2 + 10y^2; start (8, 1); rate 0.09");
});

test("backprop: a missing value is named, and a step of gradient descent inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Backprop" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Backpropagation/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Backprop" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("textbox")).toHaveValue("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; explain w");
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("(w x + b - y)^2; x = 2, w = 3, b = 1");
  await expect(dialog.locator(".preview .error")).toHaveText(/y has no value/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "and one step of gradient descent" }).click();
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("backprop.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("(w x + b - y)^2; x = 2, w = 3, b = 1, y = 10; learn w b; rate 0.01");
});

test("softmax: a wrong target is refused, and three temperatures insert", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Softmax" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Softmax & cross-entropy/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Softmax" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("textbox")).toHaveValue("[2, 1, 0.1]; labels cat, dog, bird; target cat");
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("[2, 1, 0.1]; target 3");
  await expect(dialog.locator(".preview .error")).toHaveText(/The target is a class number from 0 to 2/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "temperature 0.5, 1, 5" }).click();
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("softmax.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue("[2, 1, 0.1]; temperature 0.5, 1, 5; target 0");
});

test("embeddings: an unknown name is refused, and an analogy inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Embeddings" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Embeddings & cosine similarity/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Embeddings" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("textbox")).toHaveValue("cat [0.9, 0.8, 0.1], dog [0.85, 0.75, 0.2], car [0.1, 0.2, 0.9]; query cat");
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("cat [0.9, 0.8], dog [0.85, 0.75]; query bird");
  await expect(dialog.locator(".preview .error")).toHaveText(/There is no vector called bird: the names are cat, dog/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "king − man + woman" }).click();
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("embeddings.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue(/; analogy king - man \+ woman$/);
});

test("SVD & PCA: a rank too large is refused, and PCA of points inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "SVD" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /SVD & PCA/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "SVD & PCA" })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("tab", { name: "SVD & PCA" })).toBeInViewport({ ratio: 0.95 });
  await expect(dialog.getByRole("textbox")).toHaveValue("[[3, 2, 2], [2, 3, -2]]; rank 1");
  const preview = dialog.locator(".preview img");
  await expect(preview).toBeVisible();

  await dialog.getByRole("textbox").fill("[[3, 2, 2], [2, 3, -2]]; rank 3");
  await expect(dialog.locator(".preview .error")).toHaveText(/Keep from 1 to 2 singular values/);
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();

  await dialog.getByRole("button", { name: "PCA: the line through the points" }).click();
  await expect(preview).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("svd.png") });
  await dialog.getByRole("button", { name: "Insert" }).click();

  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Edit math for AI/ }).click();
  await expect(page.getByRole("dialog").getByRole("textbox")).toHaveValue(/; pca$/);
});

test("the gradient descent lab: too small a rate runs out of steps, a better one reaches the bottom", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Descent lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Gradient descent lab/ }).click();
  const lab = page.locator(".live-descentLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Roll the ball to the bottom of the valley in 10 steps or fewer/)).toBeVisible();
  await lab.getByRole("button", { name: /Run/ }).click();
  await expect(lab.getByText(/Out of steps: the ball crept towards the bottom/)).toBeVisible();

  const eta = lab.getByRole("slider", { name: "Learning rate η" });
  await eta.fill(String(etaIndex(0.4)));
  await eta.dispatchEvent("pointerup");
  await expect(lab.getByText("η = 0.4")).toBeVisible();
  await expect(lab.getByText(/The next step, −η · f′\(x\), is 2\.4/)).toBeVisible();
  await lab.getByRole("button", { name: /Run/ }).click();
  await expect(lab.getByText(/Done! Steps: \d+\. ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("descent-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the PCA lab: a line across the cloud is not the best, turned along it is PC1", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "PCA lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /PCA lab/ }).click();
  const lab = page.locator(".live-pcaLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Turn the line .* add up to as little as they can/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/Not the best line yet/)).toBeVisible();

  const angle = lab.getByRole("slider", { name: "Angle of the line" });
  const a1 = Math.round(principal(moments(PCA_LADDER[0].pts)).angle);
  await angle.fill(String(a1));
  await angle.dispatchEvent("pointerup");
  await expect(lab.getByText(`θ = ${a1}°`)).toBeVisible();
  await expect(lab.getByText(/kept \+ lost = .* = 4\.21/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/PC1, the first principal component.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("pca-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the overfitting lab: degree 1 misses the points, degree 9 goes through them all", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Overfitting lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Overfitting lab/ }).click();
  const lab = page.locator(".live-fitLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Raise the degree d of the curve until it goes through every training point/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/The training error is 0\.26, more than 0\.001/)).toBeVisible();

  const degree = lab.getByRole("slider", { name: "Degree of the curve" });
  await degree.fill("9");
  await degree.dispatchEvent("pointerup");
  await expect(lab.getByText("d = 9")).toBeVisible();
  await expect(lab.getByText(/^training error 0$/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/it has memorised the points, noise and all!.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("fit-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the batch training lab: too small a rate is slow, 0.2 settles at the best line", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Batch lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Batch training lab/ }).click();
  const lab = page.locator(".live-batchLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Fit the line to all 24 points at once/)).toBeVisible();
  await expect(lab.getByRole("button", { name: "Adam" })).toBeDisabled();
  await lab.getByRole("button", { name: /Run/ }).click();
  await expect(lab.getByText(/Out of epochs, still [\d.]+ above the best and coming down steadily/)).toBeVisible();

  const eta = lab.getByRole("slider", { name: "Learning rate η" });
  await eta.fill(String(ETAS.indexOf(0.2)));
  await eta.dispatchEvent("pointerup");
  await expect(lab.getByText("η₀ = 0.2")).toBeVisible();
  await lab.getByRole("button", { name: /Run/ }).click();
  await expect(lab.getByText(/0\.5 already blows up!.*Done! ★★☆/)).toBeVisible();
  await expect(lab.getByText(/Epoch 20 of 20 · step 20 of 20/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("batch-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the threshold lab: a high threshold misses positives, a lower one catches 90 %", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Threshold lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Threshold lab/ }).click();
  const lab = page.locator(".live-rocLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Drag t so that at least 90 % of the positives are caught/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/Recall is 0\.\d+: the positives left of the threshold are missed/)).toBeVisible();

  const t = lab.getByRole("slider", { name: "Threshold t" });
  await t.fill("30");
  await t.dispatchEvent("pointerup");
  await expect(lab.getByText("t = 0.30")).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/recall rises, but so do the false alarms!.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("roc-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the softmax lab: cat's probability is short, its bar dragged up gets it over 0.8", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Softmax lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Softmax lab/ }).click();
  const lab = page.locator(".live-softmaxLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/so that cat gets at least 0\.8 of the probability/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/p\(cat\) is 0\.31, short of 0\.8/)).toBeVisible();

  // Drag cat's bar from 0.5 up to 4.
  const svg = (await lab.locator("svg[role=img]").boundingBox())!;
  const k = svg.width / SM_PLOT.w;
  const x = svg.x + (SM_PLOT.zLeft + (SM_PLOT.zRight - SM_PLOT.zLeft) / 6) * k;
  await page.mouse.move(x, svg.y + zToY(0.5) * k);
  await page.mouse.down();
  await page.mouse.move(x, svg.y + zToY(2) * k, { steps: 4 });
  await page.mouse.move(x, svg.y + zToY(4) * k, { steps: 4 });
  await page.mouse.up();
  await expect(lab.getByText(/Σ e\^\(z\/T\) = 54\.60 \+ 2\.72 \+ 1\.00 = 58\.32/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/always add up to 1!.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("softmax-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the embeddings lab: dog at right angles to cat is not alike, beside it it is", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Embeddings lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Embeddings lab/ }).click();
  const lab = page.locator(".live-embedLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/so that cat and dog are alike: a cosine of at least 0\.95/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/The cosine is 0\. Turn the arrow/)).toBeVisible();

  // Drag dog's tip from (−1, 2.5) to (2.4, 1.3), beside cat's.
  const svg = (await lab.locator("svg[role=img]").boundingBox())!;
  const k = svg.width / EMBED_PLOT.w;
  const at = (x: number, y: number) => embedPage([x, y]).map((v, i) => (i ? svg.y : svg.x) + v * k) as [number, number];
  await page.mouse.move(...at(-1, 2.5));
  await page.mouse.down();
  await page.mouse.move(...at(1, 2), { steps: 4 });
  await page.mouse.move(...at(2.4, 1.3), { steps: 4 });
  await page.mouse.up();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/Alike means pointing the same way.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("embed-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the backprop lab goes on the board from the AI menu, and its boxes are filled in by hand", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Backprop lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Backprop lab/ }).click();
  const lab = page.locator(".live-backpropLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Fill in ∂L\/∂q and ∂L\/∂z/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText("The box for ∂L/∂q is empty.")).toBeVisible();

  // A tap on q's box, under its circle, goes to its field; Enter goes on to z's.
  const svg = (await lab.locator("svg[role=img]").boundingBox())!;
  const k = svg.width / BP_PLOT.w;
  const [qx, qy] = bpPos(bpGraph("classic")).q;
  await page.mouse.click(svg.x + qx * k, svg.y + (qy + 36) * k);
  await expect(lab.getByLabel("∂L/∂q")).toBeFocused();
  await page.keyboard.type("−4");
  await page.keyboard.press("Enter");
  await expect(lab.getByLabel("∂L/∂z")).toBeFocused();
  await expect(lab.getByText(/z goes into L = q × z, with local slope q/)).toBeVisible();
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/A × gate swaps its inputs.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("backprop-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the tensors lab goes on the board from the AI menu, and its entries and places are tapped", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Tensors lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Tensors lab/ }).click();
  const lab = page.locator(".live-tensorLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Tap the entry T\[1, 2\]/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/Nothing is tapped yet/)).toBeVisible();

  // The cells of the 3 × 4 matrix, and the places in memory, in the picture's own units; the picture is found afresh
  // for each tap, since a longer prompt above it moves it down.
  const { cells, mem } = tnLayout(viewOf(tnSetup("m34")));
  const tap = async (b: { x: number; y: number; cs: number }) => {
    const svg = (await lab.locator("svg[role=img]").boundingBox())!;
    const k = svg.width / TN_PLOT.w;
    await page.mouse.click(svg.x + (b.x + b.cs / 2) * k, svg.y + (b.y + b.cs / 2) * k);
  };
  await tap(cells[2 * 4 + 1]);
  await expect(lab.getByText("Tapped: T[2, 1] = 62.")).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/T\[2, 1\] has the right indices in the wrong order/)).toBeVisible();
  await tap(cells[1 * 4 + 2]);
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/Indices count from 0.*Done! ★☆☆/)).toBeVisible();
  // One star does not pass: puzzle 2 stays locked until puzzle 1 is done again with at most one wrong try.
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toHaveCount(0);
  await lab.getByRole("button", { name: /Try again/ }).click();
  await tap(cells[1 * 4 + 2]);
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/Done! ★★★/)).toBeVisible();

  // Puzzle 2: T[2, 1] at place 2·4 + 1 = 9, and once done the entry and its place are linked.
  await lab.getByRole("button", { name: /^Puzzle 2/ }).click();
  await tap(cells[2 * 4 + 1]);
  await expect(lab.getByText(/Tapped/)).toHaveCount(0);
  await tap(mem[9]);
  await expect(lab.getByText("Tapped: place 9.")).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/Row-major.*Done! ★★★/)).toBeVisible();
  await expect(lab.getByText("T[2, 1] = 62 sits at place 2·4 + 1·1 = 9.")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("tensor-lab.png") });
});

test("the k-NN lab: the point among the blue is called blue, dragged into the orange blob it is orange", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "k-NN lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Nearest neighbours lab/ }).click();
  const lab = page.locator(".live-knnLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/Drag it until it is called orange/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText("The point is called blue, and you want orange.")).toBeVisible();

  // Drag the new point from (0.3, 0.42) to (0.75, 0.75).
  const svg = (await lab.locator("svg[role=img]").boundingBox())!;
  const k = svg.width / KNN_PLOT.w;
  const [x0, y0] = knnPx(0.3, 0.42);
  const [x1, y1] = knnPx(0.75, 0.75);
  await page.mouse.move(svg.x + x0 * k, svg.y + y0 * k);
  await page.mouse.down();
  await page.mouse.move(svg.x + x1 * k, svg.y + y1 * k, { steps: 6 });
  await page.mouse.up();
  await expect(lab.locator(".descent-read")).toHaveText(/called orange/);
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/every other point says nothing at all!.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("knn-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});

test("the decision-tree lab: no split yet says so, a cut at x < 0.6 makes both sides pure", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Decision-tree lab" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Decision-tree lab/ }).click();
  const lab = page.locator(".live-treeLab");
  await lab.waitFor();
  const box = (await lab.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(lab.getByText(/slide the cut so that both sides are pure/)).toBeVisible();
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/There is no split yet/)).toBeVisible();

  await lab.getByRole("button", { name: "cut on x" }).click();
  const cut = lab.getByRole("slider", { name: "Cut t" });
  await cut.fill("120");
  await cut.dispatchEvent("pointerup");
  await expect(lab.getByText("x < 0.600")).toBeVisible();
  await lab.getByRole("button", { name: "Split", exact: true }).click();
  await expect(lab.locator(".descent-read")).toHaveText(/2 boxes · training accuracy 1/);
  await lab.getByRole("button", { name: /Check/ }).click();
  await expect(lab.getByText(/a tree is a chain of such questions!.*Done! ★★☆/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("tree-lab.png") });
  await expect(lab.getByRole("button", { name: /^Puzzle 2/ })).toBeEnabled();
});
