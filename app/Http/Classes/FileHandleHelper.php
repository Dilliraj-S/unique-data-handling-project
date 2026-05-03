<?php
namespace App\Http\Classes;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Log;
use Exception;
class FileHandleHelper
{
    /**
     * Handle file upload and store it in both public and storage directories with a random hash name.
     * 
     * @param Request $request
     * @param string $field
     * @param string $path
     * @param string $type 'public' or 'storage' to determine which path to return. Default is 'public'.
     * @return string|null
     * @throws Exception
     */
    public static function upload(Request $request, string $field, string $path, string $type = 'public'): ?string
    {
        try {
            // Check if the file exists in the request
            if (!$request->hasFile($field)) {
                return null;
            }
            $file = $request->file($field);
            // Validate the file
            if (!$file->isValid()) {
                throw new Exception('Invalid file upload.');
            }
            // Generate a random hash for the file name
            $fileName = Str::random(40) . '.' . $file->getClientOriginalExtension();
            // Define relative storage paths
            $publicPath = 'storage/' . $path;
            $storagePath = 'app/public/' . $path;
            // Also save the file to the local storage path
            $storedStoragePath = Storage::disk('public')->putFileAs($path, $file, $fileName);
            $storedStoragePath = Storage::disk('storage')->putFileAs($path, $file, $fileName);
            if (!$storedStoragePath) {
                throw new Exception('Failed to save the file in the local storage.');
            }
            // Return the path based on the 'type' parameter
            if ($type === 'public') {
                return $publicPath . '/' . $fileName; // Public path
            } elseif ($type === 'storage') {
                return $storagePath . '/' . $fileName; // Storage path
            }
            // Default to returning the public path
            return $publicPath . '/' . $fileName;
        } catch (Exception $e) {
            // Rethrow the exception for higher-level handling
            throw new Exception('File upload failed: ' . $e->getMessage());
        }
    }
    /**
     * Handle file download from both public and storage directories.
     *
     * @param string $filePath The path of the file to be downloaded.
     * @param string $fileName The name of the file to be downloaded.
     * @param string $type 'public' or 'storage' to specify the file path type.
     * @return StreamedResponse|null
     * @throws Exception
     */
    public static function download(string $filePath, string $fileName, string $type = 'public'): ?StreamedResponse
    {
        try {
            // Define the correct file path based on the type
            if ($type === 'public') {
                // For public path, use Laravel's built-in response to download the file
                $fullPath = public_path('storage/' . $filePath);
                if (file_exists($fullPath)) {
                    return response()->download($fullPath, $fileName);
                } else {
                    throw new Exception('File does not exist in the public directory.');
                }
            } elseif ($type === 'storage') {
                // For storage path, use Storage facade to download the file
                $fullPath = 'public/' . $filePath;
                if (Storage::exists($fullPath)) {
                    return Storage::download($fullPath, $fileName);
                } else {
                    throw new Exception('File does not exist in the storage directory.');
                }
            }
            // Throw an error if type is invalid
            throw new Exception('Invalid file type provided.');
        } catch (Exception $e) {
            // Return a generic error response or re-throw the exception
            throw new Exception('File download failed: ' . $e->getMessage());
        }
    }
}
