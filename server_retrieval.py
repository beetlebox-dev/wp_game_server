import json
import time
from google.cloud import storage  # pip install --upgrade google-cloud-storage


# (c) 2023 Johnathan Pennington | All rights reserved.


BUCKET_NAME = 'app-storage-bucket'
SUB_PATH = 'wp-game/'  # Each subfolder ends with /  # Start with nothing.


class Serve:

    def __init__(self):
        self.bucket = None
        self.blobs = {}

    def get_bucket(self):
        storage_client = storage.Client()
        self.bucket = storage_client.bucket(BUCKET_NAME)

    def get_blob(self, file_path):
        if file_path not in self.blobs:
            if self.bucket is None:
                self.get_bucket()
            blob = self.bucket.blob(f'{SUB_PATH}{file_path}')
            self.blobs[file_path] = blob
        return self.blobs[file_path]

    def receive(self, file_path, return_string=False):
        """If return_string is True, a string is returned regardless of the source file type.
Otherwise, a dictionary is returned from json files, or a list of lines from non-json files (i.e. txt)."""
        blob = self.get_blob(file_path)
        with blob.open('r') as file:
            if return_string:
                return file.read()
            elif file_path[-5:] == '.json':
                server_dict = json.load(file)
                return server_dict
            else:
                whole_str = file.read()
                line_list = whole_str.split('\n')
                return line_list

    def append(self, file_path, new_lines, max_lines=200):
        """Respects holds. Pass in new_lines as a list of strings."""
        existing_lines = self.hold(file_path)
        if existing_lines is None:
            # Hold could not be acquired.
            print(f'Unable to acquire hold for file "{file_path}" at append(). New lines: {str(new_lines)}')
            return
        existing_lines.extend(new_lines)
        del existing_lines[:-max_lines]
        new_str = '\n'.join(existing_lines)
        self.release(file_path, new_str)

    def hold(self, file_path, return_string=False, force_hold=True):
        """Use this method to retrieve a file before possible overwrite.
This prevents other processes from writing to the file while it is being held.
Returns None if hold could not be acquired.
If return_string is True, a string is returned regardless of the source file type.
Otherwise, a dictionary is returned from json files, or a list of lines as strings from non-json files (i.e. txt)."""

        secs_btwn_attempts = 0.2
        attempt_timeout = 10  # seconds
        hold_exp_secs = 6  # How many seconds before a hold expires.
        # Hold_exp_secs <= attempt_timeout

        hold_file_path = f'{file_path}.hold'
        exp_file_path = f'{file_path}.exp'
        acquired_hold = False  # Init.

        start_timestamp = time.time()

        print(f'Initiated attempt loop to acquire hold for file {file_path}.')

        n = 0  # Attempt number
        while True:

            n += 1

            try:
                self.delete(hold_file_path)

            except:
                # Could not delete the .hold file, which should mean that another process is holding this resource.

                print(f'Attempt #{n} unable to acquire hold for file "{file_path}". '
                      f'This indicates that another process is holding this resource.')

                print(f'Initiated attempt loop to check the hold expiration for file {file_path}.')

                secs_till_expire = None  # Init. Remaining None indicates that expiration could not be determined.

                for nn in range(1, 11):
                    # Check hold expiration by retrieving .exp file.
                    # Attempt loop to give other process a chance to create file.
                    try:
                        exp_str = self.receive(exp_file_path, True)
                    except:
                        # Could not find .exp file.
                        # This means another process with the hold hasn't written it yet, or it is missing.
                        print(f'Attempt #{nn} unable to check the expiration for the hold of file "{file_path}". '
                              f'The .exp file may be missing or not yet written.')
                        time.sleep(0.05)
                    else:
                        current_timestamp = time.time()
                        secs_till_expire = float(exp_str) - current_timestamp
                        print(f'Attempt #{nn} successfully checked expiration for the hold of file "{file_path}". '
                              f'Current timestamp: {current_timestamp}. Expiration timestamp: {exp_str}. '
                              f'Seconds before expiration: {secs_till_expire}.')
                        if secs_till_expire < 0:
                            # Previous hold expired.
                            print('Current hold expired. Will attempt to acquire hold.')
                            acquired_hold = True
                        else:
                            print('Current hold is not expired. '
                                  'Will continue to check and wait for hold to be released.')
                        break

                if secs_till_expire is None:
                    # Attempt loop to retrieve hold expiration failed.
                    # This probably means that the previous hold is expired
                    # and the last process just failed to put back the .hold file.
                    print(f'After full attempt loop, unable to check the expiration '
                          f'for the hold of file "{file_path}". Will force acquire the hold and create new .exp file.')
                    acquired_hold = True

                if acquired_hold:
                    try:
                        # One more attempt just in case file was released during expiration loop check.
                        self.delete(hold_file_path)
                    except:
                        pass
                    break

                if time.time() - start_timestamp < attempt_timeout:
                    time.sleep(secs_btwn_attempts)

            else:
                # This process can now hold this resource.
                print(f'Attempt #{n} successfully acquired hold for file "{file_path}".')
                acquired_hold = True
                break

        if acquired_hold or force_hold:
            current_timestamp = time.time()
            contents_str = str(int(current_timestamp) + hold_exp_secs)
            self.upload(exp_file_path, contents_str)
            print(f'Uploaded the .exp file for the hold of file "{file_path}". '
                  f'Current timestamp: {current_timestamp}. Expiration timestamp: {contents_str}.')
            return self.receive(file_path, return_string)

        print(f'Unable to acquire hold for file "{file_path}".')
        return None  # Hold could not be acquired.

    def release(self, file_path, new_contents=None):
        """Respects holds. If new_contents is None or not passed in, the file is not changed."""
        hold_file_path = f'{file_path}.hold'
        exp_file_path = f'{file_path}.exp'
        if new_contents is not None:
            self.upload(file_path, new_contents)
            print(f'Updating content of file "{file_path}" before release.')
        try:
            self.delete(exp_file_path)
        except:
            print(f'Was unable to delete the .exp file of file "{file_path}" before release. File may be missing.')
        else:
            print(f'Deleted the .exp file of file "{file_path}" before release.')
        self.upload(hold_file_path, '')
        print(f'Uploaded the .hold file of file "{file_path}". Release complete.')

    def delete(self, file_path):
        blob = self.get_blob(file_path)
        blob.delete()
        if file_path in self.blobs:
            del self.blobs[file_path]

    def upload(self, file_path, new_contents):
        blob = self.get_blob(file_path)
        if isinstance(new_contents, dict) or isinstance(new_contents, list):
            contents_str = json.dumps(new_contents, indent=4)
        else:
            contents_str = str(new_contents)
        blob.upload_from_string(contents_str)
