 // thanks tomitm.github.io
 (function() {

     var appPathExp = new RegExp('^https?:\/\/hihello.monster\/appmanifest\/.*');
     var unpkgPathExp = new RegExp('^https?:\/\/unpkg.com\/appmanifest\/.*');
     var ravenConfig = {
         whitelistUrls: [appPathExp, unpkgPathExp],
         includeUrls: [appPathExp]
     }

     // thanks @mitchhentges for hosting
     // se oculto esta Raven.config('https://de036bea98de4585b546148f6adfc1b6@sentry.fuzzlesoft.ca/3', ravenConfig).install()

     var elements = {
         form: document.querySelector('form'),
         lang: document.querySelector('#lang'),
         output: document.querySelector('#output pre'),
         iconTable: document.querySelector('#icons tbody'),
         addIcon: document.querySelector('#add_icons'),
         screenshotsTable: document.querySelector('#screenshots tbody'),
         addScreenshot: document.querySelector('#add_screenshots'),
         relatedTable: document.querySelector('#related_applications tbody'),
         addRelated: document.querySelector('#add_related_applications'),
         copyManifest: document.querySelector('#copy_manifest'),
         outputManifest: document.querySelector('#output_manifest'),
         copyHead: document.querySelector('#copy_head'),
         outputHead: document.querySelector('#output_head'),
         footer: document.querySelector('footer small'),
         messages: document.querySelector('#messages'),
         colors: document.querySelectorAll('.form-control-color'),
         toggles: document.querySelectorAll('[data-toggle="collapse"]')
     };

     // when form inputs change, update the manifest output
     elements.form.addEventListener('change', updateOutput);

     // when colour inputs change, update their borders for a nice effect
     Array.prototype.slice.call(elements.colors).map(function(element) {
         element.addEventListener('change', setBorderColor);
     });

     function setBorderColor() {
         this.style['border-color'] = this.value;
     }

     // toggle to show more/less
     Array.prototype.slice.call(elements.toggles).map(function(element) {
         element.addEventListener('click', toggle);
     });

     function toggle() {
         document.querySelector(this.dataset.target).classList.toggle('in');
         var text = this.innerText === 'More...' ? 'Less...' : 'More...';
         this.innerText = text;
     }

     // add buttons for additional rows
     elements.addIcon.addEventListener('click', addIconRow);
     elements.addRelated.addEventListener('click', addRelatedRow);
     elements.addScreenshot.addEventListener('click', addScreenshotsRow);

     // copy buttons
     elements.copyManifest.addEventListener('click', copy.bind(this, elements.outputManifest));
     elements.copyHead.addEventListener('click', copy.bind(this, elements.outputHead));


     function createInput(label, id, name, placeholder) {
         return '<td>' +
             '<label class="sr-only" for="' + id + '">' + label + '</label>' +
             '<input type="text" class="form-control form-control-sm" ' +
             'id="' + id + '" name="' + name + '" placeholder="' + placeholder + '" />' +
             '</td>';
     }

     function appendTable(table, innerHTML) {
         var tr = document.createElement('tr');
         var index = table.children.length - 1;
         tr.innerHTML = innerHTML(index);
         table.insertBefore(tr, table.lastElementChild);
     }

     function addIconRow() {
         appendTable(elements.iconTable, function(index) {
             return [
                 createInput('URL', 'icons_' + index + '_src', 'icons[' + index + '][src]', 'homescreen.png'),
                 createInput('Sizes', 'icons_' + index + '_sizes', 'icons[' + index + '][sizes]', '192x192'),
                 createInput('Type', 'icons_' + index + '_type', 'icons[' + index + '][type]', 'image/png')
             ].join('\n');
         });
     }

     function addScreenshotsRow() {
         appendTable(elements.screenshotsTable, function(index) {
             return [
                 createInput('URL', 'screenshots_' + index + '_src', 'screenshots[' + index + '][src]', 'screenshots/in-app.png'),
                 createInput('Sizes', 'screenshots_' + index + '_sizes', 'screenshots[' + index + '][sizes]', '1280x920'),
                 createInput('Type', 'screenshots_' + index + '_type', 'screenshots[' + index + '][type]', 'image/png')
             ].join('\n');
         });
     }

     function addRelatedRow() {
         appendTable(elements.relatedTable, function(index) {
             return [
                 createInput('Platform', 'related_' + index + '_platform', 'related_applications[' + index + '][platform]', 'play'),
                 createInput('ID', 'related_' + index + '_id', 'related_applications[' + index + '][id]', 'com.example.app'),
                 createInput('URL', 'related_' + index + '_url', 'related_applications[' + index + '][url]', 'https://play.google.com/store/apps/details?id=com.example.app1')
             ].join('\n')
         });
     }

     function getFormData() {
         return Array.prototype.slice.call(elements.form.elements)
             .reduce(function(form, element) {
                 var value = element.value;
                 if (!value) { // skip empty values
                     return form;
                 }

                 if (element.type === 'number') { // numbers shouldn't be strings
                     value = parseFloat(value) || value;
                 }

                 if (element.type === 'radio' && !element.checked) { // skip unchecked radios
                     return form;
                 }

                 if (element.type === 'checkbox') {
                     value = element.checked;
                     if (!value) { // skip unchecked values (default for related is false anyway)
                         return form;
                     }
                 }

                 var array = element.name.split('['); // icon/screenshots/related are object array: icon[0][src]
                 if (array.length === 1) { // not icon/etc, simple assignment
                     form[element.name] = value;
                     return form;
                 }

                 // icon[0][src] -> prop[index][name]
                 var prop = array[0];
                 var index = array[1].slice(0, -1); // 0], side-effect of split
                 var name = array[2].slice(0, -1);

                 if (!form[prop]) form[prop] = [];
                 if (!form[prop][index]) form[prop][index] = {};

                 form[prop][index][name] = value;
                 form[prop] = form[prop].filter(function(prop) { return prop !== null; });
                 return form;
             }, {});
     }

     function getImageAttrs(image) {
         var attrs = [];
         if (image.type) attrs.push('type="' + image.type + '"');
         if (image.sizes) attrs.push('sizes="' + image.sizes + '"');
         if (image.src) attrs.push('href="' + image.src + '"');

         return attrs.join(' ');
     }

     // 
     function generateHead(form) {
         var meta = [
             '<!DOCTYPE html>',
             '',
             '<!-- ⊙⩌⨀',
             '2006 - 2021 © hiHello.monster! Inc. Marketing Technology Stack',
             '2020 - 2021 © hiHello.Generador-a-Full-Web! Generador de head al full',
             '',
             'ˆ⩌ ˆ¿ Quién hizo todo esto ?',
             '    http: //twitter.com/luisangelmaciel + Gittubers ⪘ -->',
             '',
             '<html lang="es-MX" prefix="og: https://ogp.me/ns#">',
             '',
             '<head>',
             '<meta charset="UTF-8">',
             '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">',
             '<meta http-equiv="content-encoding" content="gzip">',
             '<meta http-equiv="X-UA-Compatible" content="IE=edge">',
             '<meta http-equiv="x-dns-prefetch-control" content="on">',
             '<meta http-equiv="Cache-Control" content="no-cache">',
             '<meta http-equiv="vary-header" content="Accept-Encoding">',
             '',
             '<title>XXXXXXX </title>',
             '<meta name="description" content="XXXXXXXXXXXXXX">',
             '<meta name="viewport" content="width=device-width, initial-scale=1">',
             '<meta name="keywords " content="XXXXXXXXXXXXXXXX">',
             '<meta name="author" content="[ hiHello.monster ] Luis Angel Maciel">',
             '<meta name="generator " content="HiHello.Content-Managament! Creador de contenido ">',
             '<meta name="rights" content="®hiHello.monster!">',
             '<meta name="theme-color" content="#017dbb">',
             '<meta name="robots" content="follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large" />',
             '<link rel="canonical" href="xxxxxxxxxxxxxxxxxxxxx">',
             '',
             '<meta name="googlebot" content="index, follow"> ',
             '<meta name="googlebot-video" content="index" />',
             '<meta name="googlebot-image" content="index" />',
             '<meta name="googlebot-news" content="index, follow">',
             '<meta name="msapplication-TileImage" content="xxxxxxxxxxxxxxxxxxxxxxx" />',
             '<meta name="msapplication-TileColor " content="xxxxxxxxxxxxxxxxxxxxxxx"> ',
             '<meta name="application-name" content="hiHello.monster">',
             '',
             '<meta property="og:locale" content="es_ES">',
             '<meta property="og:image:secure_url" content="xxxxxxxxxxxxxxxxxxxxx">',
             '<meta property="og:image:width" content="1200">',
             '<meta property="og:image:height" content="675">',
             '<meta property="og:image:alt" content="xxxxxxxxxxxxxxxxx">',
             '<meta property="og:image:type" content="image/jpeg">',
             'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
             'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
             'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
             '<!-- aqui tiene varias opciones -->',
             '<meta property="og:type" content="DE QUE ES Y AQUI TIENE VARIANTES: website, article, ">',
             '<!-- Opcion website  -->',
             '<meta property="og:type" content="website">',
             '<meta property="og:site_name" content="XXXXXXXXXXXXXXXXXXXX">',
             '<!-- Opcion article y si es que es article y estuvo publicado previamente, si no pase hasta name="twitter:card" -->',
             '<meta property="og:type" content="article">',
             '<meta property="og:title" content="XXXXXXXXXXXXXXXXXXXX">',
             '<meta property="og:description" content="XXXXXXXXXXXXXXXXXXXX">',
             '<meta property="og:url" content="https://XIIER.COM/TITULO/">',
             '<meta property="og:site_name" content="XXXXXXXXXXXXXXXXXXXX">',
             '<!-- article basic fin property  -->',
             '<meta property="article:publisher" content="https://www.XXXXXXXXXXXXXXXXXXXX">',
             '<meta property="article:author" content="http://XXXXXXXXXXXXXXXXXXXX">',
             '<meta property="article:section" content="Marketing">',
             '<meta property="og:updated_time" content="2021-05-11T09:47:56-03:00 XXXXXXXXXXXXXXXXXXXX">',
             '<meta property="fb:app_id" content="110849XXXXXXXXXXXXXXXXXXXX869668">',
             '<!-- article  advaned fin property  -->',

             '<meta name="twitter:card" content="summary_large_image" />',
             '<meta name="twitter:site" content="@XXXXXXXXXXXXXXXXXXXX" />',
             '<meta name="twitter:title " content="Templete HTML5 hiHello.monster ">',
             '<meta name="twitter:description " content="XXXXXXXXXXXXXXXXXXXX">',
             '<meta name="twitter:site " content="@XXXXXXXXXXXXXXXXXXXX ">',
             '<meta name="twitter:creator " content="@XXXXXXXXXXXXXXXXXXXX ">',
             '<meta name="twitter:url" content="XXXXXXXXXXXXXXXXXXXX">',
             '<meta name="twitter:image" content="XXXXXXXXXXXXXXXXXXXXg">',
             '<meta name="twitter:image:alt" property="og:image:alt" content="XXXXXXXXXXXXXXXXXXXX">',


             '<!--  son las mismas imagenes que estan indicadas en el manifiesto -->',
             '<link rel="icon" type="image/x-icon" sizes="32x32" href="img/ico/cropped-fav-color-32x32.png">',
             '<link rel="icon" type="image/x-icon" sizes="192x192" href="img/ico/cropped-fav-color-192x192.png">',
             '<link rel="icon" type="image/png" sizes="192x192 " href="img/ico/android-icon-192x192.png ">',
             '<link rel="icon" type="image/png" sizes="32x32 " href="img/ico/favicon-32x32.png ">',
             '<link rel="icon" type="image/png" sizes="96x96 " href="img/ico/favicon-96x96.png ">',
             '<link rel="icon" type="image/png" sizes="16x16 " href="img/ico/favicon-16x16.png ">',
             '<link rel="apple-touch-icon " sizes="57x57 " href="img/ico/apple-icon-57x57.png ">',
             '<link rel="apple-touch-icon " sizes="60x60 " href="img/ico/apple-icon-60x60.png ">',
             '<link rel="apple-touch-icon " sizes="72x72 " href="img/ico/apple-icon-72x72.png ">',
             '<link rel="apple-touch-icon " sizes="76x76 " href="img/ico/apple-icon-76x76.png ">',
             '<link rel="apple-touch-icon " sizes="114x114 " href="img/ico/apple-icon-114x114.png ">',
             '<link rel="apple-touch-icon " sizes="120x120 " href="img/ico/apple-icon-120x120.png ">',
             '<link rel="apple-touch-icon " sizes="144x144 " href="img/ico/apple-icon-144x144.png ">',
             '<link rel="apple-touch-icon " sizes="152x152 " href="img/ico/apple-icon-152x152.png ">',
             '<link rel="apple-touch-icon " sizes="180x180 " href="img/ico/apple-icon-180x180.png ">',
             '<link rel="apple-touch-icon-precomposed" sizes="114x114" href="img/ico/apple-touch-icon-114x114.png">',
             '<link rel="apple-touch-icon-precomposed" sizes="144x144" href="img/ico/apple-touch-icon-144x144.png">',
             '<link rel="apple-touch-icon-precomposed" sizes="120x120" href="img/ico/apple-touch-icon-120x120.png">',
             '<link rel="apple-touch-icon-precomposed" sizes="152x152" href="img/ico/apple-touch-icon-152x152.png">',
             '',
             '<link rel="profile" href="https://gmpg.org/xfn/11">',
             '',
             '<link rel="preconnect" href="https://www.googletagmanager.com" />',
             '<link rel="preconnect" href="https://www.google-analytics.com" />',
             '<link rel="preconnect " href="https://fonts.gstatic.com ">',
             '<link rel="https://api.w.org/" href="wp-json/" />',

             '<link rel="prefetch" href="XXXXXXXXXXXXXXXXXXXXxiibicon/fonts/xiibicon.eot">',
             '<link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" as="style">',
             '<link rel="preload" href="https://hihello.monster/css/bootstrap.min.css" as="style" >',
             'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
             '',
             '',
             '',
             '',
             '',
             '',
             '',
             ''
         ];


         var name = form.short_name || form.name;
         if (name) {
             meta.push('<meta name="application-name" content="' + name + '">');
             meta.push('<meta name="apple-mobile-web-app-title" content="' + name + '">');
         }

         if (form.theme_color) {
             meta.push('<meta name="theme-color" content="' + form.theme_color + '">');
             meta.push('<meta name="msapplication-navbutton-color" content="' + form.theme_color + '">');
             meta.push('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">');
         }

         if (form.start_url) {
             meta.push('<meta name="msapplication-starturl" content="' + form.start_url + '">');
         }

         meta.push('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">');

         if (form.icons) {
             meta.push(''); // add spacer for aesthetics

             form.icons.forEach(function(icon) {
                 var attrs = getImageAttrs(icon);
                 meta.push('<title>' + attrs + '</title>');
                 meta.push('<link rel="icon" ' + attrs + '>');
                 meta.push('<link rel="apple-touch-icon" ' + attrs + '>');
             });
         }

         return meta.join('\n');
     }

     function updateOutput() {
         var form = getFormData();
         var manifest = JSON.stringify(form, null, '  '); // pretty-printed, 2-spaces
         var head = generateHead(form);

         elements.outputManifest.innerText = manifest;
         elements.outputHead.innerText = head;
     }

     function copy(node) {
         var range = document.createRange();
         range.selectNodeContents(node);
         window.getSelection().removeAllRanges(); // ensure no current selection, otherwise copy may fail
         window.getSelection().addRange(range);

         try {
             document.execCommand('copy');
             showMessage('<i class="fa fa-clipboard"></i> Copied to clipboard');
         } catch (err) {
             showMessage('<i class="fa fa-warning"></i> Couldn\'t copy to your clipboard');
         } finally {
             window.getSelection().removeAllRanges();
         }
     }

     function showMessage(message) {
         var element = document.createElement('div');
         element.className = 'message active';
         element.innerHTML = message;
         elements.messages.appendChild(element);
         setTimeout(function() {
             element.classList.remove('active');
             setTimeout(function() { // wait for css animation before removing
                 elements.messages.removeChild(element);
             }, 250);
         }, 2750); // 250ms for active animation + 2.5s to message display
     }

     function reset() {
         elements.form.reset();

         // personal touch
         elements.lang.value = navigator.language;
         elements.lang.placeholder = navigator.language;

         updateOutput();
     }

     var footers = [
         '',
         ' <i class="fa fa-rocket">hi</i>',
         ' to make the web great again',
         ' who wants more web apps on his homescreen',
         ' who is tired of seeing browser UI',
         ' because it\'s ' + new Date().getFullYear()
     ];
     var rand = Math.floor(Math.random() * footers.length);
     elements.footer.innerHTML += footers[rand];

     reset();

     var shouldRegister = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
     if ('serviceWorker' in navigator && shouldRegister) {
         navigator.serviceWorker.register('sw.js').then(function(registration) {
             // only show message on worker installed event
             registration.onupdatefound = function() {
                 var worker = registration.installing;
                 if (!worker) return;

                 worker.onstatechange = function() {
                     if (worker.state === "installed") {
                         showMessage('<i class="fa fa-download"></i> Caching completed. This app works offline!');
                     }
                 };
             };
         }).catch(function(err) {
             Raven.captureException(err);
             console.log('sw failure', err);
         });
     }

 })();