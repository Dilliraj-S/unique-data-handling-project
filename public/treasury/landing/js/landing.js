(function () {
  "use strict";
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top')) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }
  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');
  function mobileNavToogle() {
    document.querySelector('body').classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
  }
  if (mobileNavToggleBtn) {
    mobileNavToggleBtn.addEventListener('click', mobileNavToogle);
  }
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });
  });
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function (e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });
  let scrollTop = document.querySelector('.scroll-top');
  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  scrollTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function (swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );
      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }
  window.addEventListener("load", initSwiper);
  new PureCounter();
  document.querySelectorAll('.faq-item h3, .faq-item .faq-toggle').forEach((faqItem) => {
    faqItem.addEventListener('click', () => {
      faqItem.parentNode.classList.toggle('faq-active');
    });
  });
  window.addEventListener('load', function (e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  });
  let navmenulinks = document.querySelectorAll('.navmenu a');
  function navmenuScrollspy() {
    navmenulinks.forEach(navmenulink => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        document.querySelectorAll('.navmenu a.active').forEach(link => link.classList.remove('active'));
        navmenulink.classList.add('active');
      } else {
        navmenulink.classList.remove('active');
      }
    })
  }
  window.addEventListener('load', navmenuScrollspy);
  document.addEventListener('scroll', navmenuScrollspy);
})();
$(document).ready(function(){
  $('.got-it-form').on('submit', function(e) {
    e.preventDefault();
    const form = $(this);
    const formData = form.serialize();
    const submitButton = form.find('.landing-btn');
    submitButton.prop('disabled', true);
    submitButton.html(
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Submitting...'
        );
    $.ajax({
        url: form.attr('action'),
        type: 'POST',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        data: formData,
        success: function(res) {
            form[0].reset();
            submitButton.prop('disabled', false);
            submitButton.html('Submit');
            if (res.status) {
                Swal.fire({
                    title: res.title || 'Success!',
                    text: res.message ||
                        'Your request has been submitted successfully. We will get back to you shortly!',
                    icon: 'success',
                    confirmButtonText: 'Thank You!'
                });
            } else {
                Swal.fire({
                    title: 'Error!',
                    text: res.message ||
                        'An error occurred while submitting your request. Please try again later.',
                    icon: 'error',
                    confirmButtonText: 'Try Again!'
                });
            }
        },
        error: function() {
            form[0].reset();
            submitButton.prop('disabled', false);
            submitButton.html('Submit');
            Swal.fire({
                title: 'Error!',
                text: 'Unable to process your request at the moment. Please check your internet connection or try again later.',
                icon: 'error',
                confirmButtonText: 'Try Again'
            });
        }
    });
});
  $(document).on('click', '.show-modal-popup', function () {
    var data_type = $(this).attr('data-type') || '-';
    $.ajax({
      url: window.location.origin + '/modal/popup/show',
      type: 'POST',
      headers: {
        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
      },
      data: { 'data_type': data_type },
      success: function (response) {
        var popModal = '.show-popup-modal';
        if (response.status) {
          $(popModal + '-heading').html(response.heading);
          $(popModal + '-tagline').html(response.tagline);
          $(popModal + '-content').html(response.content);
          $(popModal + '-size').removeClass('modal-sm modal-md modal-lg modal-xl').addClass(response.size);
          $(popModal).modal('show');
        } else {
          warningToast('Form Error!', 'Invalid form data.', 5000);
        }
      }.bind(this),
      error: function (xhr, status, error) {
        Swal.fire({
          title: 'Error!',
          text: 'Unable to process your request at the moment. Please check your internet connection or try again later.',
          icon: 'error',
          confirmButtonText: 'Thank You!'
        });
      }.bind(this)
    });
  }
  );
  $(document).on('submit', '.show-popup-modal-form', function (e) {
    e.preventDefault();
    var submitBtn = $(this).find('[type="submit"]');
    var tempBtnText = submitBtn.html();
    submitBtn.attr('disabled', true).addClass('disabled').html(tempBtnText + ' <i class="fa-solid fa-arrows-rotate fa-spin"></i>');
    var formData = new FormData(this);
    $.ajax({
      url: window.location.origin + '/modal/popup/save',
      type: 'POST',
      headers: {
        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
      },
      data: formData,
      contentType: false,
      cache: false,
      processData: false,
      success: function (response) {
        var popModal = '.show-popup-modal';
        if (response.status) {
          Swal.fire({
            title: response.title || 'Success!',
            text: response.message ||
              'Your request has been submitted successfully. We will get back to you shortly!',
            icon: 'success',
            confirmButtonText: 'Thank You!'
          });
        } else {
          Swal.fire({
            title: response.title || 'Error!',
            text: response.message ||
              'Your request has been submitted successfully. We will get back to you shortly!',
            icon: 'error',
            confirmButtonText: 'Try Again!'
          });
        }
        if (response.modal) {
          $(popModal).modal('hide');
        }
        submitBtn.removeAttr('disabled').removeClass('disabled').html(tempBtnText);
      }.bind(this),
      error: function (xhr, status, error) {
        Swal.fire({
          title: 'Error!',
          text: 'Unable to process your request at the moment. Please check your internet connection or try again later.',
          icon: 'error',
          confirmButtonText: 'Thank You!'
        });
        submitBtn.removeAttr('disabled').removeClass('disabled').html(tempBtnText);
      }.bind(this)
    });
  });
});
