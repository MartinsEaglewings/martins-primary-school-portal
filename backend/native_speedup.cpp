#include <iostream>
#include <fstream>
#include <sstream>

extern "C" {
    const char* compute_file_checksum(const char* filepath) {
        std::ifstream file(filepath, std::ios::binary);
        if (!file) return "FILE_ERROR";

        unsigned long hash = 5381;
        char buffer[1024];
        while (file.read(buffer, sizeof(buffer)) || file.gcount() > 0) {
            for (std::streamsize i = 0; i < file.gcount(); ++i) {
                hash = ((hash << 5) + hash) + buffer[i]; 
            }
        }

        std::stringstream ss;
        ss << std::hex << hash;
        std::string* result = new std::string(ss.str());
        return result->c_str();
    }
}
