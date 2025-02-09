import time
from flask import Flask, Response, render_template, request, url_for, redirect
from beetlebox.admin import admin_alert_thread
from beetlebox.persist import Serve


# (c) 2023 Johnathan Pennington | All rights reserved.


STORE_BUCKET_NAME = 'app-storage-bucket'
STORE_TOP_FOLDER = 'wp-game/'
TEMP_TOP_FOLDER = 'UnUsEd_TeMp_FoLdEr/'


app = Flask(__name__, static_folder="frontend/build", static_url_path="/public")
# React stores public files in the "build" folder.
# Public files are requested at the root url path "/" by default. Default path can be overridden within .env files.


# # TODO: Dev environment only.
# from flask_cors import CORS
# CORS(app)


@app.errorhandler(404)
def page_not_found(e):

    skip_endpoints = tuple()
    ignore_paths_starting_with = [  # Doesn't send an admin alert if request.path starts with any of these.
        '20', 'admin', 'blog', 'cms', 'feed', 'media', 'misc', 'news', 'robots', 'site', 'sito',
        'shop', 'test', 'web', 'wordpress', 'Wordpress', 'wp', 'Wp', 'xmlrpc.php',
    ]
    site_root = url_for('home', _external=True).split('//', 1)[-1][:-1]
    # Siteroot includes domain, but removes http:// or https:// if present, and removes the final forward slash.
    a_text = site_root
    rel_path = '/'

    request_of_concern = True
    for path_to_ignore in ignore_paths_starting_with:
        if request.path.startswith(f'/{path_to_ignore}'):
            request_of_concern = False
            break

    if request_of_concern:

        for rule in app.url_map.iter_rules():
            if "GET" in rule.methods and rule.endpoint not in skip_endpoints and len(rule.arguments) == 0:
                # Static folder has rule.arguments, so is skipped and rerouted to root.
                if request.path.startswith(rule.rule):  # Rule.rule is relative path.
                    rel_path = url_for(rule.endpoint)
                    if rel_path == '/':
                        continue  # Otherwise, displays final slash after site root <a> text.
                    a_text = f'{site_root}<wbr>{rel_path}'
                    break

        message_body = f'Page not found: \n{request.url}\n' \
                       f'Rendered page_not_found.html and suggested: \n{site_root}{rel_path}'
        admin_alert_thread('Web App - 404', message_body)

    return render_template('page_not_found.html', relpath=rel_path, a_text=a_text), 404


@app.route('/favicon.ico')
def favicon():
    return redirect(url_for('static', filename='favicon.ico'))


@app.route('/')
def home():
    return app.send_static_file('index.html')


@app.route('/data')
def serve_game_data():
    serve = Serve(STORE_BUCKET_NAME, STORE_TOP_FOLDER, TEMP_TOP_FOLDER)
    game_data = serve.receive('current_game.json', 'store')
    serve.send('game_downloaded', time.time(), 'store')
    return game_data


@app.route('/serverterminal', methods=['POST'])
def server_terminal():
    if request.method == 'POST':
        if 'content' not in request.form:
            message_list = ['Bad request to server_terminal.', 'POST arguments below.']
            for item in request.form:
                message_line = f'{item}: {request.form[item]}'
                message_list.append(message_line)
            message = '\n'.join(message_list)
            admin_alert_thread('Web App - ERROR', message)
            print(message)
            return Response(status=400)
        content = request.form['content']
        admin_alert_thread('Web App - Log', content)
        return Response(status=200)


if __name__ == '__main__':
    app.run()
