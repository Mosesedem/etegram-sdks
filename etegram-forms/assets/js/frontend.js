// In assets/js/frontend.js
jQuery(document).ready(function ($) {
  $(".etegrampay-form").on("submit", function (e) {
    e.preventDefault();
    const $form = $(this);
    const formId = $form.data("form-id");
    const formData = $form.serializeArray();

    console.log("Form ID:", formId); // Debug
    console.log("Form Data:", formData); // Debug

    $.ajax({
      url: eteFormsData.ajaxUrl,
      type: "POST",
      data: {
        action: "etegrampay_form_submit",
        nonce: eteFormsData.nonce,
        form_id: formId,
        form_data: formData,
      },
      success: function (response) {
        console.log("Response:", response); // Debug
        if (response.success) {
          window.location = response.data.redirect;
        } else {
          alert(response.data.message);
        }
      },
      error: function (xhr) {
        console.error("AJAX Error:", xhr.responseText); // Debug
        alert("An error occurred: " + xhr.responseText);
      },
    });
  });
});
