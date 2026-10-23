document.querySelectorAll("[data-autosubmit]").forEach((el) => el.addEventListener("change", () => el.form.submit()));

document.querySelectorAll("[data-rating-output]").forEach((range) => {
  const output = document.getElementById(range.dataset.ratingOutput);
  range.addEventListener("input", () => { output.textContent = range.value; });
});

document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!confirm(form.dataset.confirm)) event.preventDefault();
  });
});

// Open Library returns a 1×1 pixel for missing covers; swap those for the placeholder look.
document.querySelectorAll("img.cover").forEach((img) => {
  const check = () => { if (img.naturalWidth <= 1) img.classList.add("missing"); };
  img.complete ? check() : img.addEventListener("load", check);
});
