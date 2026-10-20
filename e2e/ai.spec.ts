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
// So does the softmax lab: cat's probability is short, and its bar dragged up to 4 gets it over 0.8, for two stars.
// The embeddings lab: dog at right angles to cat is not alike, and its tip dragged beside cat's is, for two stars.
// And the backprop lab: a Check with the boxes empty says which one, and q's box tapped and both boxes filled in are
// right, for two stars.
import { expect, test } from "@playwright/test";
import { BP_PLOT, bpGraph, bpPos } from "../src/math/backpropLab.ts";
import { etaIndex } from "../src/math/descentLab.ts";
import { EMBED_PLOT, toPage as embedPage } from "../src/math/embedLab.ts";
import { moments, PCA_LADDER, principal } from "../src/math/pcaLab.ts";
import { SM_PLOT, zToY } from "../src/math/softmaxLab.ts";

test("the tensor tool draws, explains a ragged list and inserts", async ({ page, request }) => {
  const made = await (await request.post("/api/boards", { data: { title: "Tensors" } })).json();
  await page.goto(`/#/b/${made.id}`);
  await page.locator(".excalidraw").waitFor();
  await page.getByRole("button", { name: /\bAI\b/ }).click();
  await page.getByRole("menuitem", { name: /Tensors/ }).click();

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
