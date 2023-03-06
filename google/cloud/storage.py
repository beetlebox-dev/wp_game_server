import os


# Simulates the google.cloud.storage module as it runs on the Google server.


class Blob:

    def __init__(self, file_path):
        self.file_path = file_path

    def open(self, mode):
        return open(self.file_path, mode)

    def delete(self):
        os.remove(self.file_path)

    def upload_from_string(self, contents_str):
        with open(self.file_path, 'w') as file:
            file.write(str(contents_str))


class Bucket:

    def __init__(self, bucket_name):
        self.bucket_name = bucket_name

    def blob(self, file_path):
        return Blob(f'{self.bucket_name}/{file_path}')


class Client:
    def bucket(self, bucket_name):
        return Bucket(bucket_name)
