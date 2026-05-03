<?php
namespace App\Http\Classes;
use Illuminate\Support\Facades\DB;
use Exception;
use App\Http\Classes\{Helper, UserHelper};
use App\Models\User;
class RandomHelper
{
    /* ----------------------------------------------------------------------------------------------
    Random Unique ID
    ---------------------------------------------------------------------------------------------- */
    /**
     * Generate a random unique ID consisting of alphanumeric characters.
     *
     * @param int $length The length of the unique ID.
     * @return string The generated unique ID in uppercase.
     */
    public static function generateUniqueId($length)
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return strtoupper(self::generateRandomString($characters, $length));
    }
    /* ----------------------------------------------------------------------------------------------
    Random Uniq ID
    ---------------------------------------------------------------------------------------------- */
    /**
     * Generate a random unique ID consisting of alphanumeric characters.
     *
     * @param int $length The length of the unique ID.
     * @return string The generated unique ID in uppercase.
     */
    public static function generateUniqId($length)
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return self::generateRandomString($characters, $length);
    }
    /* ----------------------------------------------------------------------------------------------
    Random Unique Number
    ---------------------------------------------------------------------------------------------- */
    /**
     * Generate a random unique number string.
     *
     * @param int $length The length of the unique number.
     * @return string The generated unique number.
     */
    public static function generateUniqueNumber($length)
    {
        $characters = '123456789';
        return self::generateRandomString($characters, $length);
    }
    /* ----------------------------------------------------------------------------------------------
    Random Unique Text
    ---------------------------------------------------------------------------------------------- */
    /**
     * Generate a random unique text consisting of alphabetic characters.
     *
     * @param int $length The length of the unique text.
     * @return string The generated unique text in uppercase.
     */
    public static function generateUniqueText($length)
    {
        $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return strtoupper(self::generateRandomString($characters, $length));
    }
    /* ----------------------------------------------------------------------------------------------
    Random String with Special Characters
    ---------------------------------------------------------------------------------------------- */
    /**
     * Generate a random string with special characters included.
     *
     * @param int $length The length of the random string.
     * @return string The generated string with special characters in uppercase.
     */
    public static function generateUniqueSpecial($length)
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()-_=+';
        return strtoupper(self::generateRandomString($characters, $length));
    }
    /* ----------------------------------------------------------------------------------------------
    Random String from Custom Character Set
    ---------------------------------------------------------------------------------------------- */
    /**
     * Generate a random string from a custom character set.
     *
     * @param int $length The length of the random string.
     * @param string $characters The set of characters to use.
     * @return string The generated random string in uppercase.
     */
    public static function generateFromCustomSet($length, $characters)
    {
        return strtoupper(self::generateRandomString($characters, $length));
    }
    /* ----------------------------------------------------------------------------------------------
    Helper Function to Generate Random String
    ---------------------------------------------------------------------------------------------- */
    /**
     * Helper function to generate a random string from a given set of characters.
     *
     * @param string $characters The characters to choose from.
     * @param int $length The length of the generated string.
     * @return string The generated random string.
     */
    private static function generateRandomString($characters, $length)
    {
        $randomString = '';
        $charactersLength = strlen($characters);
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, $charactersLength - 1)];
        }
        return $randomString;
    }

    public static function generateNumber() {
        return rand(10000, 65000);
    }
    

    /**
     * Generates a unique identifier based on the provided prefix and length.
     * 
     * This method uses a table and column mapping from the `tableFinder` method and 
     * ensures that the generated ID is unique by checking against the database. 
     * The ID format varies depending on the prefix provided.
     *
     * @param string $prefix The prefix used for generating the unique ID (e.g., 'GT', 'ORG').
     * @param int $length The length of the unique ID to be generated (used for certain prefixes).
     * 
     * @return string A unique ID generated based on the given prefix and length.
     * 
     * @throws Exception If the ID generation fails due to a database error or any other issue.
     */
    public static function uniqueId($prefix, $length = 7)
    {
        // Retrieve table and column mappings based on the prefix
        [$tableName, $columnName, $uniqueName] = Helper::tableFinder($prefix);

        try {
            if ($prefix == "GT" || $prefix == "GOT") {
                do {
                        $unique_id = 'GT-' . RandomHelper::generateNumber();
                        $org_id = UserHelper::getCurrentUser('org_id');
                } while (DB::table($tableName)->where($columnName, $unique_id)->where('org_id', $org_id)->exists());
                
            } else {
                do {
                    if ($prefix == "ORG") {
                        $unique_id = 'ORG' . RandomHelper::generateUniqueNumber(5);
                    } else {
                        $unique_id = $prefix . RandomHelper::generateUniqueId($length);
                    }
                } while (DB::table($tableName)->where($columnName, $unique_id)->exists());
                
            }
            return $unique_id;
        } catch (Exception $e) {
            // Handle any errors during ID generation
            throw new Exception("Failed to generate unique ID: " . $e->getMessage());
        }
    }
    /**
     * Generates a unique UID for a specific bio table.
     * 
     * This method generates a random integer UID and ensures it is unique by checking 
     * against the specified table in the database.
     * 
     * @param string $bio_table The name of the table to check for UID uniqueness.
     * 
     * @return int A unique UID.
     */
    public static function uid()
    {
        try {
            do {
                $id = rand(10000, 65000);
                $orgId = UserHelper::getCurrentUser('org_id');
                $exists = User::where('du_uid', $id)
                ->where('org_id', $orgId)
                ->exists();
            } while ($exists); 
            return $id;
        } catch (Exception $e) {
            // Handle any errors during UID generation
            throw new Exception("Failed to generate UID: " . $e->getMessage());
        }
    }
}
